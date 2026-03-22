import axiosClient from '@/configurations/axios.config';
import type { ResponseSuccess } from '@/types/api-response';
import type { AccessTokenResponse, LoginRequest, RegisterRequest, RegisterResponse } from '@/types/auth';

const AUTH_API_PREFIX = '/identity-service/api/v1/auth';

export const authService = {
  login: async (payload: LoginRequest): Promise<ResponseSuccess<AccessTokenResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<AccessTokenResponse>>(`${AUTH_API_PREFIX}/login`, payload);
    return response.data;
  },

  register: async (payload: RegisterRequest): Promise<ResponseSuccess<RegisterResponse>> => {
    const response = await axiosClient.post<ResponseSuccess<RegisterResponse>>(`${AUTH_API_PREFIX}/register`, payload);
    return response.data;
  },
};
