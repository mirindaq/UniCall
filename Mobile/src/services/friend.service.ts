import axiosClient from '@/configurations/axios.config';
import { API_PREFIXES } from '@/constants/api-prefixes';
import type { PageResponse, ResponseSuccess } from '@/types/api-response';
import type { FriendItem } from '@/types/friendship';

const FRIEND_API_PREFIX = API_PREFIXES.friends;
const FRIEND_REQUEST_API_PREFIX = API_PREFIXES.friendRequests;

export type RelationshipStatus = 'FRIEND' | 'SENT' | 'RECEIVED' | 'NONE';

export const friendService = {
  getAllFriends: async (idAccount: string): Promise<ResponseSuccess<FriendItem[]>> => {
    const response = await axiosClient.get<ResponseSuccess<FriendItem[]>>(
      `${FRIEND_API_PREFIX}/idAccount/${idAccount}`
    );
    return response.data;
  },

  checkRelationship: async (
    idAccountOrigin: string,
    idAccountTarget: string
  ): Promise<ResponseSuccess<RelationshipStatus>> => {
    const response = await axiosClient.get<ResponseSuccess<RelationshipStatus>>(
      `${FRIEND_API_PREFIX}/check-relationship/idAccountOrigin/${idAccountOrigin}/idTarget/${idAccountTarget}`
    );
    return response.data;
  },

  deleteFriend: async (idFriend: string): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.delete<ResponseSuccess<void>>(
      `${FRIEND_API_PREFIX}/${idFriend}`
    );
    return response.data;
  },
};

export type FriendRequestStatus = 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELED' | 'CANCELLED';

export type FriendRequestPayload = {
  idAccountSent: string;
  idAccountReceive: string;
  firstName: string;
  lastName: string;
  content: string;
};

export type FriendRequestStatusUpdatePayload = {
  status: FriendRequestStatus;
};

export type FriendRequestItem = {
  idFriendRequest: string;
  idAccountSent: string;
  idAccountReceive: string;
  pathAvartar?: string | null;
  firstName?: string;
  lastName?: string;
  content?: string;
  timeRequest?: string;
  status: FriendRequestStatus;
};

export const friendRequestService = {
  createFriendRequest: async (
    payload: FriendRequestPayload
  ): Promise<ResponseSuccess<FriendRequestItem>> => {
    const response = await axiosClient.post<ResponseSuccess<FriendRequestItem>>(
      FRIEND_REQUEST_API_PREFIX,
      payload
    );
    return response.data;
  },

  updateFriendRequestStatus: async (
    idFriendRequest: string | null,
    payload: FriendRequestStatusUpdatePayload
  ): Promise<ResponseSuccess<FriendRequestItem>> => {
    const response = await axiosClient.put<ResponseSuccess<FriendRequestItem>>(
      `${FRIEND_REQUEST_API_PREFIX}/${idFriendRequest}/status`,
      payload
    );
    return response.data;
  },

  getAllFriendRequests: async (
    idAccount: string,
    page = 0,
    size = 50,
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<ResponseSuccess<PageResponse<FriendRequestItem>>> => {
    const response = await axiosClient.get<ResponseSuccess<PageResponse<FriendRequestItem>>>(
      `${FRIEND_REQUEST_API_PREFIX}/all/${idAccount}`,
      { params: { page, size, sortDirection } }
    );
    return response.data;
  },

  checkFriendRequestStatus: async (
    idAccountSent: string,
    idAccountReceive: string
  ): Promise<ResponseSuccess<FriendRequestStatus>> => {
    const response = await axiosClient.get<ResponseSuccess<FriendRequestStatus>>(
      `${FRIEND_REQUEST_API_PREFIX}/status/idAccountSent/${idAccountSent}/idAccountReceive/${idAccountReceive}`
    );
    return response.data;
  },
};
