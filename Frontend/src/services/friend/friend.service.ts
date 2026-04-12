import axiosClient from "@/configurations/axios.config"
import { API_PREFIXES } from "@/constants/api-prefixes"
import type { ResponseSuccess } from "@/types/api-response"

const FRIEND_API_PREFIX = API_PREFIXES.friends
const FRIEND_REQUEST_API_PREFIX = API_PREFIXES.friendRequests

export type RelationshipStatus = "FRIEND" | "SENT" | "RECEIVED" | "NONE"
export type FriendshipResponse = {
    idRequest?: string
    areFriends: boolean
    isYourself: boolean
    note?: string
    isMeSent: boolean
}

export type FriendApiItem = {
    idFriend: string
    idAccountSent: string
    idAccountReceive: string
    pathAvartar?: string
    avatar?: string
    firstName?: string
    lastName?: string
    friendType?: string
}

export const friendService = {
    // Get all friends of an account
    getAllFriends: async (idAccount: string): Promise<ResponseSuccess<FriendApiItem[]>> => {
        const response = await axiosClient.get<ResponseSuccess<FriendApiItem[]>>(
            `${FRIEND_API_PREFIX}/idAccount/${idAccount}`
        )
        return response.data
    },

    // Check relationship between two accounts
    checkRelationship: async (
        idAccountOrigin: string,
        idAccountTarget: string
    ): Promise<ResponseSuccess<FriendshipResponse>> => {
        const response = await axiosClient.get<ResponseSuccess<FriendshipResponse>>(
            `${FRIEND_API_PREFIX}/check-relationship/idAccountOrigin/${idAccountOrigin}/idTarget/${idAccountTarget}`
        )
        return response.data
    },

    // Delete a friend
    deleteFriend: async (idFriend: string): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.delete<ResponseSuccess<void>>(
            `${FRIEND_API_PREFIX}/${idFriend}`
        )
        return response.data
    },
}

// friend request

export type FriendRequestStatus = "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED"

export type FriendRequestPayload = {
    idAccountSent: string
    idAccountReceive: string
    firstName: string
    lastName: string
    content: string
}

export type FriendRequestStatusUpdatePayload = {
    status: FriendRequestStatus
}

export type FriendRequestItem = {
    id: string
    idAccountSent: string
    idAccountReceive: string
    status: FriendRequestStatus
    createdAt?: string
    updatedAt?: string
}

export const friendRequestService = {
    // Create a friend request
    createFriendRequest: async (payload: FriendRequestPayload): Promise<ResponseSuccess<FriendRequestItem>> => {
        const response = await axiosClient.post<ResponseSuccess<FriendRequestItem>>(
            FRIEND_REQUEST_API_PREFIX,
            payload
        )
        return response.data
    },

    // Update friend request status
    updateFriendRequestStatus: async (
        idFriendRequest: string | null,
        payload: FriendRequestStatusUpdatePayload
    ): Promise<ResponseSuccess<FriendRequestItem>> => {
        const response = await axiosClient.put<ResponseSuccess<FriendRequestItem>>(
            `${FRIEND_REQUEST_API_PREFIX}/${idFriendRequest}/status`,
            payload
        )
        return response.data
    },

    // Get friend requests received by an account
    getAllFriendRequests: async (
        idAccountReceive: string
    ): Promise<ResponseSuccess<FriendRequestItem[]>> => {
        const response = await axiosClient.get<ResponseSuccess<FriendRequestItem[]>>(
            `${FRIEND_REQUEST_API_PREFIX}/all/${idAccountReceive}`
        )
        return response.data
    },

    // Check friend request status between two accounts
    checkFriendRequestStatus: async (
        idAccountSent: string,
        idAccountReceive: string
    ): Promise<ResponseSuccess<FriendRequestStatus>> => {
        const response = await axiosClient.get<ResponseSuccess<FriendRequestStatus>>(`${FRIEND_REQUEST_API_PREFIX}/status/idAccountSent/${idAccountSent}/idAccountReceive/${idAccountReceive}`)
        return response.data
    },
}



