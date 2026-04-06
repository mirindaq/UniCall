import axiosClient from '@/configurations/axios.config';
import type { ResponseSuccess } from '@/types/api-response';
import type { UpdateMyProfileRequest, UserProfile } from '@/types/user';

const USER_API_PREFIX = '/user-service/api/v1/users';

export const userService = {
  getMyProfile: async (): Promise<ResponseSuccess<UserProfile>> => {
    const response = await axiosClient.get<ResponseSuccess<UserProfile>>(`${USER_API_PREFIX}/me`);
    return response.data;
  },

  updateMyProfile: async (payload: UpdateMyProfileRequest): Promise<ResponseSuccess<UserProfile>> => {
    const response = await axiosClient.put<ResponseSuccess<UserProfile>>(`${USER_API_PREFIX}/me`, payload);
    return response.data;
  },

  updateMyAvatar: async (fileUri: string): Promise<ResponseSuccess<UserProfile>> => {
    const filename = fileUri.split('/').pop() || `avatar-${Date.now()}.jpg`;
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeType =
      extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';

    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);

    const response = await axiosClient.put<ResponseSuccess<UserProfile>>(
      `${USER_API_PREFIX}/me/avatar`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  getProfileByIdentityUserId: async (identityUserId: string): Promise<ResponseSuccess<UserProfile>> => {
    const response = await axiosClient.get<ResponseSuccess<UserProfile>>(
      `${USER_API_PREFIX}/identity/${identityUserId}`
    );
    return response.data;
  },
};
