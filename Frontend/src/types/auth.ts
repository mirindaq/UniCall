export interface RegisterRequest {
  phoneNumber: string
  email: string
  firstName: string
  lastName: string
  gender: "MALE" | "FEMALE" | "OTHER"
  dateOfBirth: string
  password: string
}

export interface LoginRequest {
  phoneNumber: string
  password: string
}

export interface ResendVerificationEmailRequest {
  phoneNumber: string
  email: string
}

export interface ForgotPasswordRequest {
  phoneNumber: string
  email: string
}

export interface ChangePasswordRequest {
  phoneNumber: string
  currentPassword: string
  newPassword: string
}

export interface RegisterResponse {
  userId: string
  phoneNumber: string
  email: string
  firstName: string
  lastName: string
  gender: "MALE" | "FEMALE" | "OTHER"
  dateOfBirth: string
  message: string
}

export interface AccessTokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  scope: string
}
