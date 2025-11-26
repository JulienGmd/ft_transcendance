import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { getGoogleAuthUrl, getGoogleProfile } from './google';
import { findOrCreateGoogleUser, findOrCreateClassicUser } from './auth.service';
import bcrypt from 'bcrypt';
import { verifyJWT } from './jwt';
import { generate2FASecret, generate2FAQrCode, verify2FACode, generateSimple2FACode, send2FACodeSMS, send2FACodeEmail, verifySimple2FACode } from './2fa';
import { isValidEmail, isValidPassword } from './validation';

type FastifyInstanceWithDB = FastifyInstance & { db: any };

// Stockage temporaire des codes 2FA SMS/email (à remplacer par Redis/DB en prod)
const twoFACodeStore: Record<string, { code: string, expiresAt: number }> = {};

export async function authRoutes(fastify: FastifyInstanceWithDB) {
  // 1. Redirection vers Google
  fastify.get('/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.redirect(getGoogleAuthUrl());
  });

  // 2. Callback Google
  fastify.get('/auth/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const code = (request.query as any).code as string;
    if (!code) return reply.status(400).send('Code manquant');
    try {
      const profile = await getGoogleProfile(code);
      const user = findOrCreateGoogleUser({ id: profile.id, email: profile.email });
      // Génération d'un JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );
      reply.send({ token, user });
    } catch (err) {
      reply.status(500).send('Erreur OAuth2');
    }
  });

  // 3. Connexion classique (email + mot de passe)
  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    if (!email || !password) return reply.status(400).send('Email ou mot de passe manquant');
    if (!isValidEmail(email)) return reply.status(400).send('Email invalide');
    if (!isValidPassword(password)) return reply.status(400).send('Mot de passe trop faible');
    // Ici, on suppose que le mot de passe reçu est en clair et doit être hashé pour la création
    // et comparé au hash pour la connexion. Si déjà hashé côté client, adapter !
    let user = fastify.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
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
    reply.send({ token, user });
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
    reply.send({ token, user });
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
    const db = require('better-sqlite3')('auth.db');
    db.prepare('UPDATE users SET twofa_secret = ?, twofa_enabled = TRUE WHERE id = ?').run(secret, userId);
    db.close();
    reply.send({ success: true });
  });

  // 7. Vérification du code 2FA à la connexion
  fastify.post('/auth/2fa/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, token } = request.body as { userId: number; token: string };
    if (!userId || !token) return reply.status(400).send('Paramètres manquants');
    const db = require('better-sqlite3')('auth.db');
    const user = db.prepare('SELECT twofa_secret, twofa_enabled FROM users WHERE id = ?').get(userId);
    db.close();
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
    const db = require('better-sqlite3')('auth.db');
    const tokenEntry = db.prepare('SELECT user_id FROM tokens WHERE refresh_token = ?').get(refreshToken);
    if (!tokenEntry) {
      db.close();
      return reply.status(401).send('Refresh token invalide');
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenEntry.user_id);
    db.close();
    if (!user) return reply.status(401).send('Utilisateur inconnu');
    const newToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    reply.send({ token: newToken });
  });

  // Déconnexion (invalidation du refresh token)
  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    if (!refreshToken) return reply.status(400).send('Refresh token manquant');
    const db = require('better-sqlite3')('auth.db');
    db.prepare('DELETE FROM tokens WHERE refresh_token = ?').run(refreshToken);
    db.close();
    reply.send({ success: true });
  });
}