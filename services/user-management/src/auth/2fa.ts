import Database from "better-sqlite3"
import qrcode from "qrcode"
import speakeasy from "speakeasy"

export function generate2FASecret(email: string) {
  const secret = speakeasy.generateSecret({
    name: `ft_transcendance (${email})`,
    length: 32,
  })
  return secret
}

export async function generate2FAQrCode(otpauthUrl: string): Promise<string> {
  return await qrcode.toDataURL(otpauthUrl)
}

export function verify2FACode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  })
}

// Génération d'un code 2FA pour SMS ou email (6 chiffres, valable 5 min)
export function generateSimple2FACode(): { code: string; expiresAt: number } {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes
  return { code, expiresAt }
}

// Mock d'envoi SMS (à remplacer par un vrai service SMS)
export async function send2FACodeSMS(phone: string, code: string) {
  // Ici, intégrer un vrai service SMS (Twilio, etc.)
  console.log(`[SMS] Code 2FA pour ${phone} : ${code}`)
}

// Mock d'envoi email (à remplacer par un vrai service email)
export async function send2FACodeEmail(email: string, code: string) {
  // Ici, intégrer un vrai service email (SendGrid, etc.)
  console.log(`[EMAIL] Code 2FA pour ${email} : ${code}`)
}

// Vérification d'un code simple (SMS/email)
export function verifySimple2FACode(input: string, code: string, expiresAt: number): boolean {
  return input === code && Date.now() < expiresAt
}

// Génération et stockage du code 2FA pour SMS dans la DB
export function generateAndStoreSMS2FACode(userId: number): { code: string; expiresAt: number } {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = Date.now() + 5 * 60 * 1000
  const db = new Database("auth.db")
  db.prepare("UPDATE users SET sms_2fa_code = ?, sms_2fa_expires_at = ? WHERE id = ?").run(code, expiresAt, userId)
  db.close()
  return { code, expiresAt }
}

// Génération et stockage du code 2FA pour email dans la DB
export function generateAndStoreEmail2FACode(userId: number): { code: string; expiresAt: number } {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = Date.now() + 5 * 60 * 1000
  const db = new Database("auth.db")
  db.prepare("UPDATE users SET email_2fa_code = ?, email_2fa_expires_at = ? WHERE id = ?").run(code, expiresAt, userId)
  db.close()
  return { code, expiresAt }
}

// Vérification du code 2FA SMS depuis la DB
export function verifySMS2FACode(userId: number, input: string): boolean {
  const db = new Database("auth.db")
  const user = db.prepare("SELECT sms_2fa_code, sms_2fa_expires_at FROM users WHERE id = ?").get(userId) as {
    sms_2fa_code: string
    sms_2fa_expires_at: number
  } | undefined
  db.close()
  return !!user && input === user.sms_2fa_code && Date.now() < user.sms_2fa_expires_at
}

// Vérification du code 2FA email depuis la DB
export function verifyEmail2FACode(userId: number, input: string): boolean {
  const db = new Database("auth.db")
  const user = db.prepare("SELECT email_2fa_code, email_2fa_expires_at FROM users WHERE id = ?").get(userId) as {
    email_2fa_code: string
    email_2fa_expires_at: number
  } | undefined
  db.close()
  return !!user && input === user.email_2fa_code && Date.now() < user.email_2fa_expires_at
}
