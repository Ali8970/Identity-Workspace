/** Auth feature form / view models (not wire DTOs — those live in app/models/auth.model.ts). */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterFormValue {
  arabicCompanyName: string;
  englishCompanyName: string;
  managerEmail: string;
  firstName: string;
  lastName: string;
}

export interface SetPasswordFormValue {
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordFormValue {
  newPassword: string;
  confirmPassword: string;
}

export interface LoginQueryState {
  intentId: string | null;
  returnUrl: string | null;
  selectionRestartRequired: boolean;
  /** `?onboarded=1` — set by the onboarding hand-off, which signs the owner out on purpose. */
  justOnboarded: boolean;
  /** `?activated=1` — set-password finished and sent the user here to sign in. */
  justActivated: boolean;
  /** `?email=` — carried from company registration when the owner already has an account. */
  email: string | null;
}

export interface PasswordLinkParams {
  userId: string;
  code?: string;
  token?: string;
}
