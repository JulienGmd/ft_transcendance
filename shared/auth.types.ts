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
// Types pour les erreurs d'authentification
export enum AuthErrorCode {
	INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
	USER_NOT_FOUND = 'USER_NOT_FOUND',
	USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
	INVALID_TOKEN = 'INVALID_TOKEN',
	TOKEN_EXPIRED = 'TOKEN_EXPIRED',
	WEAK_PASSWORD = 'WEAK_PASSWORD',
	INVALID_EMAIL = 'INVALID_EMAIL'
}

export interface AuthError {
	code: AuthErrorCode;
	message: string;
	details?: Record<string, any>;
}
