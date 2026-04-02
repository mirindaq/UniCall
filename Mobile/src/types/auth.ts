export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface RegisterRequest {
  phoneNumber: string;
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
  tokenType: string;
  expiresIn: number;
  scope: string;
}
