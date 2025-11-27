import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { getGoogleAuthUrl, getGoogleProfile } from './google';
import { findOrCreateGoogleUser, findOrCreateClassicUser, setUsername } from './auth.service';
import bcrypt from 'bcrypt';
import { verifyJWT, verifyToken } from './jwt';
import { generate2FASecret, generate2FAQrCode, verify2FACode } from './2fa';
import { isValidEmail, isValidPassword } from './validation';
import BetterSqlite3 from 'better-sqlite3';
import Database from 'better-sqlite3';

type FastifyInstanceWithDB = FastifyInstance & { db: any };

export async function authRoutes(fastify: FastifyInstance, db: BetterSqlite3.Database) {
  // 1. Redirection vers Google
  fastify.get('/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.redirect(getGoogleAuthUrl());
  });

  // 2. Callback Google
  fastify.get('/auth/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const code = (request.query as any).code as string;
    console.log('[OAuth] Received callback with code:', code ? 'present' : 'missing');
    
    if (!code) {
      console.error('[OAuth] No code in callback');
      return reply.status(400).send('Code manquant');
    }
    
    try {
      console.log('[OAuth] Fetching Google profile...');
      const profile = await getGoogleProfile(code);
      console.log('[OAuth] Profile received:', profile.email);
      
      console.log('[OAuth] Finding or creating user...');
      const user = findOrCreateGoogleUser({ id: profile.id, email: profile.email });
      console.log('[OAuth] User:', user.id, user.email, 'username:', user.username);
      
      // Vérifier si la 2FA TOTP est activée
      const twoFAEnabled = user.twofa_enabled || false;
      
      if (twoFAEnabled && user.twofa_secret) {
        // 2FA TOTP est activée, rediriger vers la page de validation 2FA
        // Stocker temporairement l'userId dans un cookie temporaire
        reply.setCookie('tempUserId', String(user.id), {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 300 // 5 minutes
        });
        
        // Rediriger vers une page de validation 2FA
        console.log('[OAuth] Redirecting to 2FA verification page');
        reply.redirect(`https://localhost:8080/login?twofa=totp&email=${encodeURIComponent(user.email)}`);
        return;
      }
      
      // Génération d'un JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, username: user.username },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
      
      console.log('[OAuth] Token generated, setting cookie...');
      
      // Set cookie with token
      reply.setCookie('authToken', token, {
        httpOnly: true,
        secure: true, // HTTPS only
        sameSite: 'lax',
        path: '/',
        maxAge: 3600 // 1 hour in seconds
      });
      
      // Si l'utilisateur n'a pas de username, rediriger vers la page de setup
      if (!user.username) {
        console.log('[OAuth] Redirecting to setup-profile (no username)');
        reply.redirect(`https://localhost:8080/setup-profile`);
      } else {
        // Sinon, rediriger vers home
        console.log('[OAuth] Redirecting to home (username:', user.username + ')');
        reply.redirect(`https://localhost:8080/home`);
      }
    } catch (err) {
      console.error('[OAuth] Error during Google OAuth callback:', err);
      console.error('[OAuth] Error details:', err instanceof Error ? err.message : String(err));
      console.error('[OAuth] Error stack:', err instanceof Error ? err.stack : 'no stack');
      reply.redirect('https://localhost:8080/login?error=oauth_failed');
    }
  });

  fastify.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    if (!email || !password) return reply.status(400).send('Email ou mot de passe manquant');
    if (!isValidEmail(email)) return reply.status(400).send('Email invalide');
    if (!isValidPassword(password)) return reply.status(400).send('Mot de passe trop faible');
    // Création d'un compte classique
    const passwordHash = await bcrypt.hash(password, 10);
    console.log("Registering user:", email);
    const user = findOrCreateClassicUser(email, passwordHash);
    console.log("User registered:", user);

    // Génération d'un JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    // Set cookie with token
    reply.setCookie('authToken', token, {
      httpOnly: true,
      secure: true, // HTTPS only
      sameSite: 'lax',
      path: '/',
      maxAge: 3600 // 1 hour in seconds
    });
    
    // Indiquer au frontend s'il faut rediriger vers setup-profile
    reply.send({ 
      user,
      needsSetup: !user.username // true si l'utilisateur n'a pas de username
    });
  });

  // 3. Connexion classique (email + mot de passe)
  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    if (!email || !password) return reply.status(400).send('Email ou mot de passe manquant');
    if (!isValidEmail(email)) return reply.status(400).send('Email invalide');
    if (!isValidPassword(password)) return reply.status(400).send('Mot de passe trop faible');
    // Ici, on suppose que le mot de passe reçu est en clair et doit être hashé pour la création
    // et comparé au hash pour la connexion. Si déjà hashé côté client, adapter !
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      // Création d'un compte classique
      const passwordHash = await bcrypt.hash(password, 10);
      user = findOrCreateClassicUser(email, passwordHash);
    } else {
      // Vérification du mot de passe
      if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
        return reply.status(401).send('Identifiants invalides');
      }
    }
    
    // Vérifier si la 2FA est activée
    const twoFAEnabled = user.twofa_enabled || false;
    
    if (twoFAEnabled && user.twofa_secret) {
      // 2FA TOTP est activée, ne pas donner de token complet
      // Retourner un état temporaire
      return reply.send({
        needsTwoFA: true,
        userId: user.id,
        email: user.email
      });
    }
    
    // Pas de 2FA, génération du JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    // Set cookie with token
    reply.setCookie('authToken', token, {
      httpOnly: true,
      secure: true, // HTTPS only
      sameSite: 'lax',
      path: '/',
      maxAge: 3600 // 1 hour in seconds
    });
    
    // Indiquer au frontend s'il faut rediriger vers setup-profile
    reply.send({ 
      user,
      needsSetup: !user.username // true si l'utilisateur n'a pas de username
    });
  });

  // Set username (for users who don't have one yet, typically after Google OAuth)
  fastify.post('/auth/set-username', async (request: FastifyRequest, reply: FastifyReply) => {
    const { username, avatar, totp_secret, totp_code, disable_2fa } = request.body as { 
      username: string; 
      avatar?: string;
      totp_secret?: string;
      totp_code?: string;
      disable_2fa?: boolean;
    };
    
    // Get token from cookie
    const token = request.cookies.authToken;
    if (!token) {
      return reply.status(401).send('Token manquant');
    }
    
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return reply.status(401).send('Token invalide');
    }
    
    if (!username || username.length < 3 || username.length > 20) {
      return reply.status(400).send('Username must be between 3 and 20 characters');
    }
    
    // Check if username contains only alphanumeric characters and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return reply.status(400).send('Username can only contain letters, numbers, and underscores');
    }
    
    // Validate TOTP if provided (activation de la 2FA)
    if (totp_secret && totp_code) {
      if (!verify2FACode(totp_secret, totp_code)) {
        return reply.status(400).send('Invalid verification code. Please try again.');
      }
    }
    
    const user = setUsername(decoded.userId, username, avatar);
    if (!user) {
      return reply.status(409).send('Username already taken');
    }
    
    // Gérer les modifications de 2FA
    if (disable_2fa) {
      // Désactiver la 2FA
      const stmt = db.prepare(`
        UPDATE users 
        SET twofa_enabled = ?,
            twofa_secret = ?
        WHERE id = ?
      `);
      stmt.run(0, null, decoded.userId);
    } else if (totp_secret && totp_code) {
      // Activer la 2FA avec le nouveau secret
      const stmt = db.prepare(`
        UPDATE users 
        SET twofa_enabled = ?,
            twofa_secret = ?
        WHERE id = ?
      `);
      stmt.run(1, totp_secret, decoded.userId);
    }
    // Si ni disable_2fa ni totp_secret : garder l'état actuel de la 2FA
    
    // Generate new token with username
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    // Update cookie with new token
    reply.setCookie('authToken', newToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600
    });
    
    reply.send({ user });
  });

  // Get user info from token
  fastify.get('/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    console.log('[/auth/me] Request received');
    console.log('[/auth/me] Cookies:', request.cookies);
    
    // Get token from cookie
    const token = request.cookies.authToken;
    if (!token) {
      console.log('[/auth/me] No token in cookie');
      return reply.status(401).send('Token manquant');
    }
    
    console.log('[/auth/me] Token found, verifying...');
    let decoded;
    try {
      decoded = verifyToken(token);
      console.log('[/auth/me] Token verified, userId:', decoded.userId);
    } catch (err) {
      console.log('[/auth/me] Token verification failed:', err);
      return reply.status(401).send('Token invalide');
    }
    
    // Get user from database to get latest info including avatar
    const user = db.prepare('SELECT id, username, avatar, email, google_id, twofa_enabled FROM users WHERE id = ?').get(decoded.userId);
    
    if (!user) {
      console.log('[/auth/me] User not found in DB');
      return reply.status(404).send('Utilisateur non trouvé');
    }
    
    console.log('[/auth/me] User found:', user.username);
    reply.send({ user });
  });

  // 4. Connexion Google (fusion possible)
  fastify.post('/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id, email } = request.body as { id: string; email: string };
    if (!id || !email) return reply.status(400).send('ID ou email Google manquant');
    if (!isValidEmail(email)) return reply.status(400).send('Email invalide');
    const user = findOrCreateGoogleUser({ id, email });
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    // Set cookie with token
    reply.setCookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600
    });
    
    reply.send({ user });
  });

  // 5. Génération du secret et du QR code 2FA
  fastify.post('/auth/2fa/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    // Get token from cookie
    const token = request.cookies.authToken;
    if (!token) {
      return reply.status(401).send('Non authentifié');
    }
    
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return reply.status(401).send('Token invalide');
    }
    
    // Get user email from database
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(decoded.userId) as { email: string } | undefined;
    if (!user) {
      return reply.status(404).send('Utilisateur non trouvé');
    }
    
    const secret = generate2FASecret(user.email);
    const qrCode = await generate2FAQrCode(secret.otpauth_url!);
    reply.send({ secret: secret.base32, otpauth_url: secret.otpauth_url, qrCode });
  });

  // 6. Activation de la 2FA (sauvegarde du secret)
  fastify.post('/auth/2fa/enable', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, secret, token } = request.body as { userId: number; secret: string; token: string };
    if (!userId || !secret || !token) return reply.status(400).send('Paramètres manquants');
    if (!verify2FACode(secret, token)) return reply.status(401).send('Code 2FA invalide');
    // Sauvegarde du secret et activation dans la base
    db.prepare('UPDATE users SET twofa_secret = ?, twofa_enabled = TRUE WHERE id = ?').run(secret, userId);
    reply.send({ success: true });
  });

  // Nouvelle route: Activer la 2FA depuis le profil (avec authentification)
  fastify.post('/auth/2fa/profile/enable', async (request: FastifyRequest, reply: FastifyReply) => {
    // Get token from cookie
    const authToken = request.cookies.authToken;
    if (!authToken) {
      return reply.status(401).send('Non authentifié');
    }
    
    let decoded;
    try {
      decoded = verifyToken(authToken);
    } catch (err) {
      return reply.status(401).send('Token invalide');
    }
    
    const { secret, code } = request.body as { secret: string; code: string };
    if (!secret || !code) {
      return reply.status(400).send('Secret et code requis');
    }
    
    // Vérifier le code TOTP
    if (!verify2FACode(secret, code)) {
      return reply.status(401).send('Code 2FA invalide');
    }
    
    // Activer la 2FA
    db.prepare('UPDATE users SET twofa_secret = ?, twofa_enabled = TRUE WHERE id = ?').run(secret, decoded.userId);
    
    reply.send({ success: true });
  });

  // Nouvelle route: Désactiver la 2FA depuis le profil
  fastify.post('/auth/2fa/profile/disable', async (request: FastifyRequest, reply: FastifyReply) => {
    // Get token from cookie
    const authToken = request.cookies.authToken;
    if (!authToken) {
      return reply.status(401).send('Non authentifié');
    }
    
    let decoded;
    try {
      decoded = verifyToken(authToken);
    } catch (err) {
      return reply.status(401).send('Token invalide');
    }
    
    const { code } = request.body as { code: string };
    if (!code) {
      return reply.status(400).send('Code de vérification requis');
    }
    
    // Récupérer l'utilisateur
    const user = db.prepare('SELECT twofa_secret, twofa_enabled FROM users WHERE id = ?').get(decoded.userId) as any;
    if (!user || !user.twofa_enabled || !user.twofa_secret) {
      return reply.status(400).send('2FA non activée');
    }
    
    // Vérifier le code TOTP
    if (!verify2FACode(user.twofa_secret, code)) {
      return reply.status(401).send('Code 2FA invalide');
    }
    
    // Désactiver la 2FA
    db.prepare('UPDATE users SET twofa_secret = NULL, twofa_enabled = FALSE WHERE id = ?').run(decoded.userId);
    
    reply.send({ success: true });
  });

  // 7. Vérification du code 2FA à la connexion
  fastify.post('/auth/2fa/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, token } = request.body as { userId: number; token: string };
    if (!userId || !token) return reply.status(400).send('Paramètres manquants');
    const user = db.prepare('SELECT twofa_secret, twofa_enabled FROM users WHERE id = ?').get(userId);
    if (!user || !user.twofa_enabled || !user.twofa_secret) return reply.status(400).send('2FA non activée');
    if (!verify2FACode(user.twofa_secret, token)) return reply.status(401).send('Code 2FA invalide');
    reply.send({ success: true });
  });

  // Nouvelle route: Vérification du code 2FA lors du login et génération du token complet
  fastify.post('/auth/2fa/login/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    console.log('[2FA Login Verify] Request received');
    console.log('[2FA Login Verify] Body:', request.body);
    console.log('[2FA Login Verify] Cookies:', request.cookies);
    
    const { userId, code } = request.body as { 
      userId?: number; 
      code: string;
    };
    
    // Récupérer userId depuis le cookie temporaire ou depuis le body
    let finalUserId = userId;
    if (!finalUserId) {
      const tempUserId = request.cookies.tempUserId;
      console.log('[2FA Login Verify] No userId in body, checking cookie:', tempUserId);
      if (tempUserId) {
        finalUserId = parseInt(tempUserId, 10);
      }
    }
    
    console.log('[2FA Login Verify] Final userId:', finalUserId);
    
    if (!finalUserId || !code) {
      console.log('[2FA Login Verify] Missing parameters');
      return reply.status(400).send('Paramètres manquants');
    }
    
    // Récupérer l'utilisateur
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(finalUserId) as any;
    if (!user) {
      console.log('[2FA Login Verify] User not found');
      return reply.status(404).send('Utilisateur non trouvé');
    }
    
    console.log('[2FA Login Verify] User found:', user.email);
    
    // Vérifier le code TOTP
    if (!user.twofa_enabled || !user.twofa_secret) {
      return reply.status(400).send('2FA TOTP non activée');
    }
    
    const isValid = verify2FACode(user.twofa_secret, code);
    
    if (!isValid) {
      console.log('[2FA Login Verify] Invalid code');
      return reply.status(401).send('Code 2FA invalide ou expiré');
    }
    
    console.log('[2FA Login Verify] Code valid, generating token');
    
    // Code valide, générer le token complet
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    // Set cookie with token
    reply.setCookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600
    });
    
    // Clear temp cookie if it exists
    reply.clearCookie('tempUserId', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });
    
    // Retourner les infos utilisateur
    reply.send({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar
      },
      needsSetup: !user.username
    });
  });

  // Rafraîchissement du token JWT
  fastify.post('/auth/token/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) return reply.status(400).send('Refresh token manquant');
    const tokenEntry = db.prepare('SELECT user_id FROM tokens WHERE refresh_token = ?').get(refreshToken);
    if (!tokenEntry) {
      return reply.status(401).send('Refresh token invalide');
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenEntry.user_id);
    if (!user) return reply.status(401).send('Utilisateur inconnu');
    const newToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    // Update cookie with new token
    reply.setCookie('authToken', newToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600
    });
    
    reply.send({ success: true });
  });

  // Déconnexion (invalidation du refresh token + suppression du cookie)
  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    console.log('[Logout] Received logout request');
    console.log('[Logout] Cookies:', request.cookies);
    
    try {
      // Check if there's a refresh token in the body (optional)
      if (request.body && typeof request.body === 'object') {
        const { refreshToken } = request.body as { refreshToken?: string };
        if (refreshToken) {
          console.log('[Logout] Deleting refresh token from DB');
          db.prepare('DELETE FROM tokens WHERE refresh_token = ?').run(refreshToken);
        }
      }
      
      // Clear auth cookie
      console.log('[Logout] Clearing authToken cookie');
      reply.clearCookie('authToken', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      });
      
      console.log('[Logout] Logout complete');
      reply.send({ success: true });
    } catch (error) {
      console.error('[Logout] Error during logout:', error);
      reply.status(500).send({ error: 'Logout failed' });
    }
  });
}