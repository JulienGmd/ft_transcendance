export function isValidEmail(email: string): boolean {
  // Simple email validation (char+@char+.char+)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPassword(password: string): boolean {
  // Minimum 8 chars, 1 letter and 1 number
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)
}
