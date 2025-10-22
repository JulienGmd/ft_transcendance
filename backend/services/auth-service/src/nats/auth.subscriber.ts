import { connect, StringCodec, type NatsConnection } from "nats";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getGoogleAuthUrl, getGoogleProfile } from '../google';
import { findOrCreateGoogleUser, findOrCreateClassicUser } from '../auth.service';
import { generate2FASecret, generate2FAQrCode, verify2FACode, generateSimple2FACode, send2FACodeSMS, send2FACodeEmail, verifySimple2FACode } from '../2fa';
import { isValidEmail, isValidPassword } from '../validation';
import Database from 'better-sqlite3';

import type {
  AuthLoginRequest,
  AuthRegisterRequest,
  AuthGoogleRequest,
  AuthGoogleCallbackRequest,
  Auth2FASetupRequest,
  Auth2FAEnableRequest,
  Auth2FAVerifyRequest,
  Auth2FASMSSendRequest,
  Auth2FASMSVerifyRequest,
  Auth2FAEmailSendRequest,
  Auth2FAEmailVerifyRequest,
  AuthTokenRefreshRequest,
  AuthLogoutRequest,
  AuthResponse,
  Auth2FASetupResponse,
  Auth2FAEnableResponse,
  Auth2FAVerifyResponse,
  Auth2FASMSSendResponse,
  Auth2FASMSVerifyResponse,
  Auth2FAEmailSendResponse,
  Auth2FAEmailVerifyResponse,
  AuthTokenRefreshResponse,
  AuthLogoutResponse,
  AuthGoogleCallbackResponse,
  AuthErrorCode
} from '../types/auth.types';

const codec = StringCodec();

const twoFACodeStore: Record<string, { code: string, expiresAt: number }> = {};

export class AuthSubscriber {
  private nc: NatsConnection;

  constructor(nc: NatsConnection) {
    this.nc = nc;
  }

  async start() {
    console.log('🔔 Starting Auth NATS subscribers...');

    await this.subscribeToLogin();
    await this.subscribeToRegister();
    await this.subscribeToGoogle();
    await this.subscribeToGoogleCallback();
    await this.subscribeTo2FASetup();
    await this.subscribeTo2FAEnable();
    await this.subscribeTo2FAVerify();
    await this.subscribeTo2FASMSSend();
    await this.subscribeTo2FASMSVerify();
    await this.subscribeTo2FAEmailSend();
    await this.subscribeTo2FAEmailVerify();
    await this.subscribeToTokenRefresh();
    await this.subscribeToLogout();

    console.log('✅ All Auth NATS subscribers started');
  }

  private async subscribeToLogin() {
    const sub = this.nc.subscribe('auth.login');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as AuthLoginRequest;
          const response = await this.handleLogin(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: AuthResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeToRegister() {
    const sub = this.nc.subscribe('auth.register');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as AuthRegisterRequest;
          const response = await this.handleRegister(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: AuthResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeToGoogle() {
    const sub = this.nc.subscribe('auth.google');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as AuthGoogleRequest;
          const response = await this.handleGoogle(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: AuthResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeToGoogleCallback() {
    const sub = this.nc.subscribe('auth.google.callback');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as AuthGoogleCallbackRequest;
          const response = await this.handleGoogleCallback(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: AuthGoogleCallbackResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeTo2FASetup() {
    const sub = this.nc.subscribe('auth.2fa.setup');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as Auth2FASetupRequest;
          const response = await this.handle2FASetup(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: Auth2FASetupResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeTo2FAEnable() {
    const sub = this.nc.subscribe('auth.2fa.enable');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as Auth2FAEnableRequest;
          const response = await this.handle2FAEnable(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: Auth2FAEnableResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeTo2FAVerify() {
    const sub = this.nc.subscribe('auth.2fa.verify');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as Auth2FAVerifyRequest;
          const response = await this.handle2FAVerify(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: Auth2FAVerifyResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeTo2FASMSSend() {
    const sub = this.nc.subscribe('auth.2fa.sms.send');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as Auth2FASMSSendRequest;
          const response = await this.handle2FASMSSend(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: Auth2FASMSSendResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeTo2FASMSVerify() {
    const sub = this.nc.subscribe('auth.2fa.sms.verify');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as Auth2FASMSVerifyRequest;
          const response = await this.handle2FASMSVerify(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: Auth2FASMSVerifyResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeTo2FAEmailSend() {
    const sub = this.nc.subscribe('auth.2fa.email.send');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as Auth2FAEmailSendRequest;
          const response = await this.handle2FAEmailSend(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: Auth2FAEmailSendResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeTo2FAEmailVerify() {
    const sub = this.nc.subscribe('auth.2fa.email.verify');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as Auth2FAEmailVerifyRequest;
          const response = await this.handle2FAEmailVerify(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: Auth2FAEmailVerifyResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeToTokenRefresh() {
    const sub = this.nc.subscribe('auth.token.refresh');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as AuthTokenRefreshRequest;
          const response = await this.handleTokenRefresh(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: AuthTokenRefreshResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async subscribeToLogout() {
    const sub = this.nc.subscribe('auth.logout');
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(codec.decode(msg.data)) as AuthLogoutRequest;
          const response = await this.handleLogout(data);
          msg.respond(codec.encode(JSON.stringify(response)));
        } catch (error) {
          const errorResponse: AuthLogoutResponse = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          msg.respond(codec.encode(JSON.stringify(errorResponse)));
        }
      }
    })();
  }

  private async handleLogin(data: AuthLoginRequest): Promise<AuthResponse> {
    const { email, password } = data;
    
    if (!email || !password) {
      return { success: false, error: 'Email ou mot de passe manquant' };
    }
    
    if (!isValidEmail(email)) {
      return { success: false, error: 'Email invalide' };
    }
    
    if (!isValidPassword(password)) {
      return { success: false, error: 'Mot de passe trop faible' };
    }

    const db = new Database('auth.db');
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 10);
      user = findOrCreateClassicUser(email, passwordHash);
    } else {
      if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
        db.close();
        return { success: false, error: 'Identifiants invalides' };
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    db.close();
    return { success: true, token, user };
  }

  private async handleRegister(data: AuthRegisterRequest): Promise<AuthResponse> {
    const { email, password, username } = data;
    
    if (!email || !password) {
      return { success: false, error: 'Email ou mot de passe manquant' };
    }
    
    if (!isValidEmail(email)) {
      return { success: false, error: 'Email invalide' };
    }
    
    if (!isValidPassword(password)) {
      return { success: false, error: 'Mot de passe trop faible' };
    }

    const db = new Database('auth.db');
    
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      db.close();
      return { success: false, error: 'Utilisateur déjà existant' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = findOrCreateClassicUser(email, passwordHash);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    db.close();
    return { success: true, token, user };
  }

  private async handleGoogle(data: AuthGoogleRequest): Promise<AuthResponse> {
    const { id, email } = data;
    
    if (!id || !email) {
      return { success: false, error: 'ID ou email Google manquant' };
    }
    
    if (!isValidEmail(email)) {
      return { success: false, error: 'Email invalide' };
    }

    const user = findOrCreateGoogleUser({ id, email });
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    return { success: true, token, user };
  }

  private async handleGoogleCallback(data: AuthGoogleCallbackRequest): Promise<AuthGoogleCallbackResponse> {
    const { code } = data;
    
    if (!code) {
      return { success: false, error: 'Code manquant' };
    }

    try {
      const profile = await getGoogleProfile(code);
      const user = findOrCreateGoogleUser({ id: profile.id, email: profile.email });
      
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      return { success: true, token, user };
    } catch (err) {
      return { success: false, error: 'Erreur OAuth2' };
    }
  }

  private async handle2FASetup(data: Auth2FASetupRequest): Promise<Auth2FASetupResponse> {
    const { email } = data;
    
    if (!email) {
      return { success: false, error: 'Email manquant' };
    }
    
    if (!isValidEmail(email)) {
      return { success: false, error: 'Email invalide' };
    }

    const secret = generate2FASecret(email);
    const qr = await generate2FAQrCode(secret.otpauth_url!);

    return { success: true, secret: secret.base32, otpauth_url: secret.otpauth_url, qr };
  }

  private async handle2FAEnable(data: Auth2FAEnableRequest): Promise<Auth2FAEnableResponse> {
    const { userId, secret, token } = data;
    
    if (!userId || !secret || !token) {
      return { success: false, error: 'Paramètres manquants' };
    }
    
    if (!verify2FACode(secret, token)) {
      return { success: false, error: 'Code 2FA invalide' };
    }

    const db = new Database('auth.db');
    db.prepare('UPDATE users SET twofa_secret = ?, twofa_enabled = TRUE WHERE id = ?').run(secret, userId);
    db.close();

    return { success: true };
  }

  private async handle2FAVerify(data: Auth2FAVerifyRequest): Promise<Auth2FAVerifyResponse> {
    const { userId, token } = data;
    
    if (!userId || !token) {
      return { success: false, error: 'Paramètres manquants' };
    }

    const db = new Database('auth.db');
    const user = db.prepare('SELECT twofa_secret, twofa_enabled FROM users WHERE id = ?').get(userId) as any;
    db.close();

    if (!user || !user.twofa_enabled || !user.twofa_secret) {
      return { success: false, error: '2FA non activée' };
    }
    
    if (!verify2FACode(user.twofa_secret, token)) {
      return { success: false, error: 'Code 2FA invalide' };
    }

    return { success: true };
  }

  private async handle2FASMSSend(data: Auth2FASMSSendRequest): Promise<Auth2FASMSSendResponse> {
    const { phone } = data;
    
    if (!phone) {
      return { success: false, error: 'Numéro manquant' };
    }

    const { code, expiresAt } = generateSimple2FACode();
    twoFACodeStore[phone] = { code, expiresAt };
    await send2FACodeSMS(phone, code);

    return { success: true };
  }

  private async handle2FASMSVerify(data: Auth2FASMSVerifyRequest): Promise<Auth2FASMSVerifyResponse> {
    const { phone, code } = data;
    
    const entry = twoFACodeStore[phone];
    if (!entry) {
      return { success: false, error: 'Aucun code envoyé' };
    }
    
    if (!verifySimple2FACode(code, entry.code, entry.expiresAt)) {
      return { success: false, error: 'Code invalide ou expiré' };
    }
    
    delete twoFACodeStore[phone];
    return { success: true };
  }

  private async handle2FAEmailSend(data: Auth2FAEmailSendRequest): Promise<Auth2FAEmailSendResponse> {
    const { email } = data;
    
    if (!email) {
      return { success: false, error: 'Email manquant' };
    }
    
    if (!isValidEmail(email)) {
      return { success: false, error: 'Email invalide' };
    }

    const { code, expiresAt } = generateSimple2FACode();
    twoFACodeStore[email] = { code, expiresAt };
    await send2FACodeEmail(email, code);

    return { success: true };
  }

  private async handle2FAEmailVerify(data: Auth2FAEmailVerifyRequest): Promise<Auth2FAEmailVerifyResponse> {
    const { email, code } = data;
    
    const entry = twoFACodeStore[email];
    if (!entry) {
      return { success: false, error: 'Aucun code envoyé' };
    }
    
    if (!verifySimple2FACode(code, entry.code, entry.expiresAt)) {
      return { success: false, error: 'Code invalide ou expiré' };
    }
    
    delete twoFACodeStore[email];
    return { success: true };
  }

  private async handleTokenRefresh(data: AuthTokenRefreshRequest): Promise<AuthTokenRefreshResponse> {
    const { refreshToken } = data;
    
    if (!refreshToken) {
      return { success: false, error: 'Refresh token manquant' };
    }

    const db = new Database('auth.db');
    const tokenEntry = db.prepare('SELECT user_id FROM tokens WHERE refresh_token = ?').get(refreshToken) as any;
    
    if (!tokenEntry) {
      db.close();
      return { success: false, error: 'Refresh token invalide' };
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenEntry.user_id) as any;
    db.close();
    
    if (!user) {
      return { success: false, error: 'Utilisateur inconnu' };
    }

    const newToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    return { success: true, token: newToken };
  }

  private async handleLogout(data: AuthLogoutRequest): Promise<AuthLogoutResponse> {
    const { refreshToken } = data;
    
    if (!refreshToken) {
      return { success: false, error: 'Refresh token manquant' };
    }

    const db = new Database('auth.db');
    db.prepare('DELETE FROM tokens WHERE refresh_token = ?').run(refreshToken);
    db.close();

    return { success: true };
  }
}
