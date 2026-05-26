export interface LoginResult {
  ok: boolean;
  mustChangePassword?: boolean;
  message?: string;
}

export interface FirstLoginPayload {
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface PasswordRule {
  label: string;
  valid: boolean;
}
