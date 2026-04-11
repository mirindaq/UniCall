import axiosClient from "@/configurations/axios.config"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type {
  UpdateMyProfileRequest,
  UserProfile,
  UserSearchItem,
  UserSearchQuery,
} from "@/types/user.type"

const USER_API_PREFIX = "/user-service/api/v1/users"
const MY_PROFILE_CACHE_TTL_MS = 15_000

let myProfileCache: ResponseSuccess<UserProfile> | null = null
let myProfileCacheAt = 0
let myProfilePending: Promise<ResponseSuccess<UserProfile>> | null = null

const setMyProfileCache = (value: ResponseSuccess<UserProfile>) => {
  myProfileCache = value
  myProfileCacheAt = Date.now()
}

export const userService = {
  getMyProfile: async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<ResponseSuccess<UserProfile>> => {
    const isCacheFresh =
      myProfileCache != null &&
      Date.now() - myProfileCacheAt < MY_PROFILE_CACHE_TTL_MS

    if (!forceRefresh && isCacheFresh) {
      return myProfileCache
    }

    if (!forceRefresh && myProfilePending) {
      return myProfilePending
    }

    myProfilePending = axiosClient
      .get<ResponseSuccess<UserProfile>>(`${USER_API_PREFIX}/me`)
      .then((response) => {
        setMyProfileCache(response.data)
        return response.data
      })
      .finally(() => {
        myProfilePending = null
      })

    return myProfilePending
  },

  updateMyProfile: async (payload: UpdateMyProfileRequest): Promise<ResponseSuccess<UserProfile>> => {
    const response = await axiosClient.put<ResponseSuccess<UserProfile>>(`${USER_API_PREFIX}/me`, payload)
    setMyProfileCache(response.data)
    return response.data
  },

  updateMyAvatar: async (file: File): Promise<ResponseSuccess<UserProfile>> => {
    const form = new FormData()
    form.append("file", file)
    const response = await axiosClient.put<ResponseSuccess<UserProfile>>(`${USER_API_PREFIX}/me/avatar`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    setMyProfileCache(response.data)
    return response.data
  },

  clearMyProfileCache: () => {
    myProfileCache = null
    myProfileCacheAt = 0
    myProfilePending = null
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
