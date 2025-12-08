import qrcode from "qrcode"
import speakeasy from "speakeasy"

export function generate2FASecret(email: string): { base32: string; otpauth_url: string } {
  const secret = speakeasy.generateSecret({
    name: `ft_transcendance (${email})`,
    length: 32,
  })

  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url || "",
  }
}

export async function generate2FAQrCode(otpauthUrl: string): Promise<string> {
  return await qrcode.toDataURL(otpauthUrl)
}

export function verify2FACode(secret: string, totp: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: totp,
    window: 1,
  })
}
