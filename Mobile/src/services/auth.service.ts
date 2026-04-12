import axiosClient from '@/configurations/axios.config';
import { API_PREFIXES } from '@/constants/api-prefixes';
import type { ResponseSuccess } from '@/types/api-response';
import type {
  AccessTokenResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationEmailRequest,
} from '@/types/auth';

const AUTH_API_PREFIX = API_PREFIXES.auth;
const MOBILE_CLIENT_HEADER = { 'X-Client-Type': 'mobile' };

export const authService = {
  login: async (payload: LoginRequest): Promise<ResponseSuccess<AccessTokenResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<AccessTokenResponse>>(
      `${AUTH_API_PREFIX}/login`,
      payload,
      { headers: MOBILE_CLIENT_HEADER }
    );
    return response.data;
  },

  register: async (payload: RegisterRequest): Promise<ResponseSuccess<RegisterResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<RegisterResponse>>(`${AUTH_API_PREFIX}/register`, payload);
    return response.data;
  },

  resendVerificationEmail: async (payload: ResendVerificationEmailRequest): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.post<ResponseSuccess<void>>(`${AUTH_API_PREFIX}/resend-verification-email`, payload);
    return response.data;
  },

  forgotPassword: async (payload: ForgotPasswordRequest): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.post<ResponseSuccess<void>>(`${AUTH_API_PREFIX}/forgot-password`, payload);
    return response.data;
  },

  changePassword: async (payload: ChangePasswordRequest): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.post<ResponseSuccess<void>>(`${AUTH_API_PREFIX}/change-password`, payload);
    return response.data;
  },
};
