import axiosClient from "@/configurations/axios.config"
import { buildApiUrl } from "@/constants/api"
import type { ResponseSuccess } from "@/types/api-response"
import type { FriendItem } from "@/types/friendship"

const FRIEND_API_PREFIX = "/friend-service/api/v1"
const friendApiUrl = (path: string) => buildApiUrl(`${FRIEND_API_PREFIX}${path}`)

export type RelationshipStatus = "FRIEND" | "SENT" | "RECEIVED" | "NONE"

export const friendService = {
    // Get all friends of an account
    getAllFriends: async (idAccount: string): Promise<ResponseSuccess<FriendItem[]>> => {
        const response = await axiosClient.get<ResponseSuccess<FriendItem[]>>(
            friendApiUrl(`/friends/idAccount/${idAccount}`)
        )
        return response.data
    },

    // Check relationship between two accounts
    checkRelationship: async (
        idAccountOrigin: string,
        idAccountTarget: string
    ): Promise<ResponseSuccess<RelationshipStatus>> => {
        const response = await axiosClient.get<ResponseSuccess<RelationshipStatus>>(
            friendApiUrl(`/friends/check-relationship/idAccountOrigin/${idAccountOrigin}/idTarget/${idAccountTarget}`)
        )
        return response.data
    },

    // Delete a friend
    deleteFriend: async (idFriend: string): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.delete<ResponseSuccess<void>>(
            friendApiUrl(`/friends/${idFriend}`)
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
            friendApiUrl("/friend-requestes"),
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
            friendApiUrl(`/friend-requestes/${idFriendRequest}/status`),
            payload
        )
        return response.data
    },

    // Get friend requests received by an account
    getAllFriendRequests: async (
        idAccountReceive: string
    ): Promise<ResponseSuccess<FriendRequestItem[]>> => {
        const response = await axiosClient.get<ResponseSuccess<FriendRequestItem[]>>(
            friendApiUrl(`/friend-requestes/all/${idAccountReceive}`)
        )
        return response.data
    },

    // Check friend request status between two accounts
    checkFriendRequestStatus: async (
        idAccountSent: string,
        idAccountReceive: string
    ): Promise<ResponseSuccess<FriendRequestStatus>> => {
        const response = await axiosClient.get<ResponseSuccess<FriendRequestStatus>>(
            friendApiUrl(
                `/friend-requestes/status/idAccountSent/${idAccountSent}/idAccountReceive/${idAccountReceive}`
            )
        )
        return response.data
    },
}



