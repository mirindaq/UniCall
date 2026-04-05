import axiosClient from "@/configurations/axios.config"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type {
  UpdateMyProfileRequest,
  UserProfile,
  UserSearchItem,
  UserSearchQuery,
} from "@/types/user.type"

const USER_API_PREFIX = "/user-service/api/v1/users"

export const userService = {
  getMyProfile: async (): Promise<ResponseSuccess<UserProfile>> => {
    const response = await axiosClient.get<ResponseSuccess<UserProfile>>(`${USER_API_PREFIX}/me`)
    return response.data
  },

  updateMyProfile: async (payload: UpdateMyProfileRequest): Promise<ResponseSuccess<UserProfile>> => {
    const response = await axiosClient.put<ResponseSuccess<UserProfile>>(`${USER_API_PREFIX}/me`, payload)
    return response.data
  },

  updateMyAvatar: async (file: File): Promise<ResponseSuccess<UserProfile>> => {
    const form = new FormData()
    form.append("file", file)
    const response = await axiosClient.put<ResponseSuccess<UserProfile>>(`${USER_API_PREFIX}/me/avatar`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  },

  getProfileByIdentityUserId: async (
    identityUserId: string,
  ): Promise<ResponseSuccess<UserProfile>> => {
    const response = await axiosClient.get<ResponseSuccess<UserProfile>>(
      `${USER_API_PREFIX}/identity/${identityUserId}`,
    )
    return response.data
  },

  searchUsers: async ({
    keyword,
    page = 1,
    limit = 10,
    sortBy,
    search,
  }: UserSearchQuery): Promise<ResponseSuccess<PageResponse<UserSearchItem>>> => {
    const response = await axiosClient.get<ResponseSuccess<PageResponse<UserSearchItem>>>(`${USER_API_PREFIX}/search`, {
      params: {
        keyword,
        page,
        limit,
        sortBy,
        search,
      },
    })
    return response.data
  },
}
