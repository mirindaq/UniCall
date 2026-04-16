import axiosClient from "@/configurations/axios.config"
import { API_PREFIXES } from "@/constants/api-prefixes"
import type { PageResponse, ResponseSuccess } from "@/types/api-response"
import type {
  AccountDeletionStatus,
  FriendInvitePrivacy,
  PhoneSearchPrivacy,
  RequestAccountDeletionPayload,
  UpdateMyProfileRequest,
  UserProfile,
  UserSearchItem,
  UserSearchQuery,
} from "@/types/user.type"

const USER_API_PREFIX = API_PREFIXES.users
const MY_PROFILE_CACHE_TTL_MS = 15_000
const PROFILE_CACHE_TTL_MS = 5 * 60_000

let myProfileCache: ResponseSuccess<UserProfile> | null = null
let myProfileCacheAt = 0
let myProfilePending: Promise<ResponseSuccess<UserProfile>> | null = null
const profileByIdentityCache = new Map<string, { data: ResponseSuccess<UserProfile>; at: number }>()
const profileByIdentityPending = new Map<string, Promise<ResponseSuccess<UserProfile>>>()

const setMyProfileCache = (value: ResponseSuccess<UserProfile>) => {
  myProfileCache = value
  myProfileCacheAt = Date.now()
}

export const userService = {
  getMyProfile: async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<ResponseSuccess<UserProfile>> => {
    if (
      !forceRefresh &&
      myProfileCache != null &&
      Date.now() - myProfileCacheAt < MY_PROFILE_CACHE_TTL_MS
    ) {
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
    const key = identityUserId.trim()
    const cached = profileByIdentityCache.get(key)
    if (cached && Date.now() - cached.at < PROFILE_CACHE_TTL_MS) {
      return cached.data
    }

    const pending = profileByIdentityPending.get(key)
    if (pending) {
      return pending
    }

    const request = axiosClient
      .get<ResponseSuccess<UserProfile>>(`${USER_API_PREFIX}/identity/${key}`)
      .then((response) => {
        profileByIdentityCache.set(key, {
          data: response.data,
          at: Date.now(),
        })
        return response.data
      })
      .finally(() => {
        profileByIdentityPending.delete(key)
      })

    profileByIdentityPending.set(key, request)
    return request
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

  getMyFriendInvitePrivacy: async (): Promise<ResponseSuccess<FriendInvitePrivacy>> => {
    const response = await axiosClient.get<ResponseSuccess<FriendInvitePrivacy>>(
      `${USER_API_PREFIX}/me/privacy/friend-invites`,
    )
    return response.data
  },

  updateMyFriendInvitePrivacy: async (
    allowFriendInvites: boolean,
  ): Promise<ResponseSuccess<FriendInvitePrivacy>> => {
    const response = await axiosClient.put<ResponseSuccess<FriendInvitePrivacy>>(
      `${USER_API_PREFIX}/me/privacy/friend-invites`,
      { allowFriendInvites },
    )
    return response.data
  },

  getMyPhoneSearchPrivacy: async (): Promise<ResponseSuccess<PhoneSearchPrivacy>> => {
    const response = await axiosClient.get<ResponseSuccess<PhoneSearchPrivacy>>(
      `${USER_API_PREFIX}/me/privacy/phone-search`,
    )
    return response.data
  },

  updateMyPhoneSearchPrivacy: async (
    allowPhoneSearch: boolean,
  ): Promise<ResponseSuccess<PhoneSearchPrivacy>> => {
    const response = await axiosClient.put<ResponseSuccess<PhoneSearchPrivacy>>(
      `${USER_API_PREFIX}/me/privacy/phone-search`,
      { allowPhoneSearch },
    )
    return response.data
  },

  requestMyAccountDeletion: async (
    payload: RequestAccountDeletionPayload,
  ): Promise<ResponseSuccess<AccountDeletionStatus>> => {
    const response = await axiosClient.post<ResponseSuccess<AccountDeletionStatus>>(
      `${USER_API_PREFIX}/me/deletion-request`,
      payload,
    )
    return response.data
  },

  getMyAccountDeletionStatus: async (): Promise<ResponseSuccess<AccountDeletionStatus>> => {
    const response = await axiosClient.get<ResponseSuccess<AccountDeletionStatus>>(
      `${USER_API_PREFIX}/me/deletion-request/status`,
    )
    return response.data
  },

  cancelMyAccountDeletionRequest: async (): Promise<ResponseSuccess<AccountDeletionStatus>> => {
    const response = await axiosClient.post<ResponseSuccess<AccountDeletionStatus>>(
      `${USER_API_PREFIX}/me/deletion-request/cancel`,
    )
    return response.data
  },
}
