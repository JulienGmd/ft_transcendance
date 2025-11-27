import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { getGoogleAuthUrl, getGoogleProfile } from './google';
import { findOrCreateGoogleUser, findOrCreateClassicUser, setUsername } from './auth.service';
import bcrypt from 'bcrypt';
import { verifyJWT, verifyToken } from './jwt';
import { generate2FASecret, generate2FAQrCode, verify2FACode, generateSimple2FACode, send2FACodeSMS, send2FACodeEmail, verifySimple2FACode } from './2fa';
import { isValidEmail, isValidPassword } from './validation';
import BetterSqlite3 from 'better-sqlite3';
import Database from 'better-sqlite3';

type FastifyInstanceWithDB = FastifyInstance & { db: any };

// Stockage temporaire des codes 2FA SMS/email (à remplacer par Redis/DB en prod)
const twoFACodeStore: Record<string, { code: string, expiresAt: number }> = {};

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

  // Set username (for users who don't have one yet, typically after Google OAuth)
  fastify.post('/auth/set-username', async (request: FastifyRequest, reply: FastifyReply) => {
    const { username, avatar } = request.body as { username: string; avatar?: string };
    
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
    
    const user = setUsername(decoded.userId, username, avatar);
    if (!user) {
      return reply.status(409).send('Username already taken');
    }
    
    // Generate new token with username (don't include avatar to avoid token size issues)
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
    const { email } = request.body as { email: string };
    if (!email) return reply.status(400).send('Email manquant');
    if (!isValidEmail(email)) return reply.status(400).send('Email invalide');
    const secret = generate2FASecret(email);
    const qr = await generate2FAQrCode(secret.otpauth_url!);
    reply.send({ secret: secret.base32, otpauth_url: secret.otpauth_url, qr });
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

  // 7. Vérification du code 2FA à la connexion
  fastify.post('/auth/2fa/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, token } = request.body as { userId: number; token: string };
    if (!userId || !token) return reply.status(400).send('Paramètres manquants');
    const user = db.prepare('SELECT twofa_secret, twofa_enabled FROM users WHERE id = ?').get(userId);
    if (!user || !user.twofa_enabled || !user.twofa_secret) return reply.status(400).send('2FA non activée');
    if (!verify2FACode(user.twofa_secret, token)) return reply.status(401).send('Code 2FA invalide');
    reply.send({ success: true });
  });

  // Générer et envoyer un code 2FA par SMS
  fastify.post('/auth/2fa/sms/send', async (request: FastifyRequest, reply: FastifyReply) => {
    const { phone } = request.body as { phone: string };
    if (!phone) return reply.status(400).send('Numéro manquant');
    const { code, expiresAt } = generateSimple2FACode();
    twoFACodeStore[phone] = { code, expiresAt };
    await send2FACodeSMS(phone, code);
    reply.send({ success: true });
  });

  // Générer et envoyer un code 2FA par email
  fastify.post('/auth/2fa/email/send', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email: string };
    if (!email) return reply.status(400).send('Email manquant');
    if (!isValidEmail(email)) return reply.status(400).send('Email invalide');
    const { code, expiresAt } = generateSimple2FACode();
    twoFACodeStore[email] = { code, expiresAt };
    await send2FACodeEmail(email, code);
    reply.send({ success: true });
  });

  // Vérifier le code 2FA reçu par SMS
  fastify.post('/auth/2fa/sms/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { phone, code } = request.body as { phone: string, code: string };
    const entry = twoFACodeStore[phone];
    if (!entry) return reply.status(400).send('Aucun code envoyé');
    if (!verifySimple2FACode(code, entry.code, entry.expiresAt)) return reply.status(401).send('Code invalide ou expiré');
    delete twoFACodeStore[phone];
    reply.send({ success: true });
  });

  // Vérifier le code 2FA reçu par email
  fastify.post('/auth/2fa/email/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, code } = request.body as { email: string, code: string };
    const entry = twoFACodeStore[email];
    if (!entry) return reply.status(400).send('Aucun code envoyé');
    if (!verifySimple2FACode(code, entry.code, entry.expiresAt)) return reply.status(401).send('Code invalide ou expiré');
    delete twoFACodeStore[email];
    reply.send({ success: true });
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