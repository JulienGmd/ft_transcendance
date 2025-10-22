// shared/auth.types.ts
export interface AuthLoginRequest {
	email: string;
	password: string;
}

export interface AuthRegisterRequest {
	email: string;
	password: string;
	username?: string;
}

export interface AuthResponse {
	success: boolean;
	error?: string;
	token?: string;
	user?: UserProfile;
}

export interface UserProfile {
	id: string;
	email: string;
	username: string;
	createdAt: string;
	updatedAt: string;
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
// Types pour les requêtes 2FA
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

export interface AuthGoogleRequest {
	id: string;
	email: string;
}

export interface AuthGoogleCallbackRequest {
	code: string;
}

export interface AuthLogoutRequest {
	refreshToken: string;
}

// Types pour les réponses 2FA
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

export interface AuthGoogleCallbackResponse {
	success: boolean;
	error?: string;
	token?: string;
	user?: UserProfile;
}

export interface AuthLogoutResponse {
	success: boolean;
	error?: string;
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
