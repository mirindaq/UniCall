import axiosClient from '@/configurations/axios.config';
import type { ResponseSuccess } from '@/types/api-response';
import type { FriendItem } from '@/types/friendship';

const FRIEND_API_PREFIX = '/friend-service/api/v1';

export type RelationshipStatus = 'FRIEND' | 'SENT' | 'RECEIVED' | 'NONE';

export const friendService = {
  getAllFriends: async (idAccount: string): Promise<ResponseSuccess<FriendItem[]>> => {
    const response = await axiosClient.get<ResponseSuccess<FriendItem[]>>(
      `${FRIEND_API_PREFIX}/friends/idAccount/${idAccount}`
    );
    return response.data;
  },

  checkRelationship: async (
    idAccountOrigin: string,
    idAccountTarget: string
  ): Promise<ResponseSuccess<RelationshipStatus>> => {
    const response = await axiosClient.get<ResponseSuccess<RelationshipStatus>>(
      `${FRIEND_API_PREFIX}/friends/check-relationship/idAccountOrigin/${idAccountOrigin}/idTarget/${idAccountTarget}`
    );
    return response.data;
  },

  deleteFriend: async (idFriend: string): Promise<ResponseSuccess<void>> => {
    const response = await axiosClient.delete<ResponseSuccess<void>>(
      `${FRIEND_API_PREFIX}/friends/${idFriend}`
    );
    return response.data;
  },
};

export type FriendRequestStatus = 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

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
  id: string;
  idAccountSent: string;
  idAccountReceive: string;
  status: FriendRequestStatus;
  createdAt?: string;
  updatedAt?: string;
};

export const friendRequestService = {
  createFriendRequest: async (
    payload: FriendRequestPayload
  ): Promise<ResponseSuccess<FriendRequestItem>> => {
    const response = await axiosClient.post<ResponseSuccess<FriendRequestItem>>(
      `${FRIEND_API_PREFIX}/friend-requestes`,
      payload
    );
    return response.data;
  },

  updateFriendRequestStatus: async (
    idFriendRequest: string | null,
    payload: FriendRequestStatusUpdatePayload
  ): Promise<ResponseSuccess<FriendRequestItem>> => {
    const response = await axiosClient.put<ResponseSuccess<FriendRequestItem>>(
      `${FRIEND_API_PREFIX}/friend-requestes/${idFriendRequest}/status`,
      payload
    );
    return response.data;
  },

  getAllFriendRequests: async (idAccountReceive: string): Promise<ResponseSuccess<FriendRequestItem[]>> => {
    const response = await axiosClient.get<ResponseSuccess<FriendRequestItem[]>>(
      `${FRIEND_API_PREFIX}/friend-requestes/all/${idAccountReceive}`
    );
    return response.data;
  },

  checkFriendRequestStatus: async (
    idAccountSent: string,
    idAccountReceive: string
  ): Promise<ResponseSuccess<FriendRequestStatus>> => {
    const response = await axiosClient.get<ResponseSuccess<FriendRequestStatus>>(
      `${FRIEND_API_PREFIX}/friend-requestes/status/idAccountSent/${idAccountSent}/idAccountReceive/${idAccountReceive}`
    );
    return response.data;
  },
};
