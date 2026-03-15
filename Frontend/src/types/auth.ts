export interface RegisterRequest {
  phoneNumber: string
  fullName: string
  gender: "MALE" | "FEMALE" | "OTHER"
  dateOfBirth: string
  password: string
}

export interface RegisterResponse {
  userId: string
  phoneNumber: string
  fullName: string
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
