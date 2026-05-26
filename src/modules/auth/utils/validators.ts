import type { PasswordRule } from "@/modules/auth/types/auth";

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePeruPhone(phone: string) {
  const digits = onlyDigits(phone);
  const withoutCountryCode = digits.startsWith("51") && digits.length > 9 ? digits.slice(2) : digits;
  return withoutCountryCode.slice(0, 9);
}

export function formatPeruPhone(phone: string) {
  return `+51${normalizePeruPhone(phone)}`;
}

export function validatePeruPhoneDigits(phone: string) {
  return /^9\d{8}$/.test(normalizePeruPhone(phone));
}

export function validatePeruPhone(phone: string) {
  return validatePeruPhoneDigits(phone);
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    { label: "Mínimo 8 caracteres", valid: password.length >= 8 },
    { label: "Contiene mayúscula", valid: /[A-ZÁÉÍÓÚÑ]/.test(password) },
    { label: "Contiene minúscula", valid: /[a-záéíóúñ]/.test(password) },
    { label: "Contiene número", valid: /\d/.test(password) },
    { label: "Contiene carácter especial", valid: /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(password) }
  ];
}

export function isStrongPassword(password: string) {
  return getPasswordRules(password).every((rule) => rule.valid);
}
