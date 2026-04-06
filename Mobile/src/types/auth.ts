export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface RegisterRequest {
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  password: string;
}

export interface RegisterResponse {
  userId: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  message: string;
}

export interface AccessTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  refreshExpiresIn: number;
  scope: string;
}

export interface ResendVerificationEmailRequest {
  phoneNumber: string;
  email: string;
}

export interface ForgotPasswordRequest {
  phoneNumber: string;
  email: string;
}

export interface ChangePasswordRequest {
  phoneNumber: string;
  currentPassword: string;
  newPassword: string;
}
