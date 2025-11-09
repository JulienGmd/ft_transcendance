// Types pour l'auth-service - Requêtes et réponses NATS

// Types de base
export interface User {
  id: number;
  google_id: string | null;
  email: string;
  password_hash: string | null;
  twofa_secret?: string | null;
  twofa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Types pour les requêtes NATS
export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest {
  email: string;
  password: string;
  username?: string;
}

export interface AuthGoogleRequest {
  id: string;
  email: string;
}

export interface AuthGoogleCallbackRequest {
  code: string;
}

export interface Auth2FASetupRequest {
  email: string;
}

export interface Auth2FAEnableRequest {
  userId: number;
  secret: string;
  token: string;
}

export interface Auth2FAVerifyRequest {
  userId: number;
  token: string;
}

export interface Auth2FASMSSendRequest {
  phone: string;
}

export interface Auth2FASMSVerifyRequest {
  phone: string;
  code: string;
}

export interface Auth2FAEmailSendRequest {
  email: string;
}

export interface Auth2FAEmailVerifyRequest {
  email: string;
  code: string;
}

export interface AuthTokenRefreshRequest {
  refreshToken: string;
}

export interface AuthLogoutRequest {
  refreshToken: string;
}

// Types pour les réponses NATS
export interface AuthResponse {
  success: boolean;
  error?: string;
  token?: string;
  user?: User;
}

export interface Auth2FASetupResponse {
  success: boolean;
  error?: string;
  secret?: string;
  otpauth_url?: string;
  qr?: string;
}

export interface Auth2FAEnableResponse {
  success: boolean;
  error?: string;
}

export interface Auth2FAVerifyResponse {
  success: boolean;
  error?: string;
}

export interface Auth2FASMSSendResponse {
  success: boolean;
  error?: string;
}

export interface Auth2FASMSVerifyResponse {
  success: boolean;
  error?: string;
}

export interface Auth2FAEmailSendResponse {
  success: boolean;
  error?: string;
}

export interface Auth2FAEmailVerifyResponse {
  success: boolean;
  error?: string;
}

export interface AuthTokenRefreshResponse {
  success: boolean;
  error?: string;
  token?: string;
}

export interface AuthLogoutResponse {
  success: boolean;
  error?: string;
}

export interface AuthGoogleCallbackResponse {
  success: boolean;
  error?: string;
  token?: string;
  user?: User;
}

// Types pour les événements NATS
export interface AuthUserRegisteredEvent {
  email: string;
  password: string;
  timestamp: string;
}

export interface AuthLoginAttemptEvent {
  email: string;
  success: boolean;
  timestamp: string;
  ip?: string;
}

// Types pour les erreurs d'authentification
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_EMAIL = 'INVALID_EMAIL',
  MISSING_PARAMETERS = 'MISSING_PARAMETERS',
  INVALID_2FA_CODE = 'INVALID_2FA_CODE',
  TWOFA_NOT_ENABLED = 'TWOFA_NOT_ENABLED',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
  OAUTH_ERROR = 'OAUTH_ERROR'
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, any>;
}
