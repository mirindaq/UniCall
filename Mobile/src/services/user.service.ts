import axiosClient from '@/configurations/axios.config';
import type { PageResponse, ResponseSuccess } from '@/types/api-response';
import type {
  AccountDeletionStatus,
  FriendInvitePrivacy,
  PhoneSearchPrivacy,
  RequestAccountDeletionRequest,
  UpdateMyProfileRequest,
  UserProfile,
  UserSearchItem,
  UserSearchQuery,
} from '@/types/user';

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

  requestAccountDeletion: async (
    payload: RequestAccountDeletionRequest
  ): Promise<ResponseSuccess<AccountDeletionStatus>> => {
    const response = await axiosClient.post<ResponseSuccess<AccountDeletionStatus>>(
      `${USER_API_PREFIX}/me/deletion-request`,
      payload
    );
    return response.data;
  },

  getMyAccountDeletionStatus: async (): Promise<ResponseSuccess<AccountDeletionStatus>> => {
    const response = await axiosClient.get<ResponseSuccess<AccountDeletionStatus>>(
      `${USER_API_PREFIX}/me/deletion-request/status`
    );
    return response.data;
  },

  getMyFriendInvitePrivacy: async (): Promise<ResponseSuccess<FriendInvitePrivacy>> => {
    const response = await axiosClient.get<ResponseSuccess<FriendInvitePrivacy>>(
      `${USER_API_PREFIX}/me/privacy/friend-invites`
    );
    return response.data;
  },

  updateMyFriendInvitePrivacy: async (allowFriendInvites: boolean): Promise<ResponseSuccess<FriendInvitePrivacy>> => {
    const response = await axiosClient.put<ResponseSuccess<FriendInvitePrivacy>>(
      `${USER_API_PREFIX}/me/privacy/friend-invites`,
      { allowFriendInvites }
    );
    return response.data;
  },

  getMyPhoneSearchPrivacy: async (): Promise<ResponseSuccess<PhoneSearchPrivacy>> => {
    const response = await axiosClient.get<ResponseSuccess<PhoneSearchPrivacy>>(
      `${USER_API_PREFIX}/me/privacy/phone-search`
    );
    return response.data;
  },

  updateMyPhoneSearchPrivacy: async (allowPhoneSearch: boolean): Promise<ResponseSuccess<PhoneSearchPrivacy>> => {
    const response = await axiosClient.put<ResponseSuccess<PhoneSearchPrivacy>>(
      `${USER_API_PREFIX}/me/privacy/phone-search`,
      { allowPhoneSearch }
    );
    return response.data;
  },

  searchUsers: async ({
    keyword,
    page = 1,
    limit = 10,
    sortBy,
    search,
  }: UserSearchQuery): Promise<ResponseSuccess<PageResponse<UserSearchItem>>> => {
    const response = await axiosClient.get<ResponseSuccess<PageResponse<UserSearchItem>>>(
      `${USER_API_PREFIX}/search`,
      {
        params: {
          keyword,
          page,
          limit,
          sortBy,
          search,
        },
      }
    );
    return response.data;
  },
};
