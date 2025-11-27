import validator from 'validator';

export function isValidEmail(email: string): boolean {
  return validator.isEmail(email);
}

export function isValidPassword(password: string): boolean {
  // Minimum 8 caractères, au moins une lettre et un chiffre
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
}
