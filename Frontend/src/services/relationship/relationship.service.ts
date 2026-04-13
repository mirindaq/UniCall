import axiosClient from "@/configurations/axios.config"
import { buildApiUrl } from "@/constants/api"
import type { ResponseSuccess } from "@/types/api-response"

const FRIEND_API_PREFIX = "/friend-service/api/v1"
const relationshipApiUrl = (path: string) => buildApiUrl(`${FRIEND_API_PREFIX}${path}`)

export type RelationshipType = string[]

export type RelationshipRequest = {
    actorId: string
    targetId: string
    relationshipType: RelationshipType
}

export type RelationshipResponse = {
    actorId: string
    targetId: string
    relationshipType?: RelationshipType
    relationshipTypes?: RelationshipType[]
}

export const relationshipService = {
    // Create a relationship between two users
    createRelationship: async (payload: RelationshipRequest): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.post<ResponseSuccess<void>>(
            relationshipApiUrl("/relationships"),
            payload
        )
        return response.data
    },

    // Get relationship between two users
    getRelationshipBetweenUsers: async (
        userId1: string,
        userId2: string
    ): Promise<ResponseSuccess<RelationshipResponse>> => {
        const response = await axiosClient.get<ResponseSuccess<RelationshipResponse>>(
            relationshipApiUrl(`/relationships/${userId1}/${userId2}`)
        )
        return response.data
    },

    // Get relationships by type
    getRelationshipsByType: async (type: string): Promise<ResponseSuccess<RelationshipResponse[]>> => {
        const response = await axiosClient.get<ResponseSuccess<RelationshipResponse[]>>(
            relationshipApiUrl(`/relationships/${type}`)
        )
        return response.data
    },

    // Update a relationship
    updateRelationship: async (payload: RelationshipRequest): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.put<ResponseSuccess<void>>(
            relationshipApiUrl("/relationships"),
            payload
        )
        return response.data
    },

    // Delete a relationship
    deleteRelationship: async (relationshipId: string): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.delete<ResponseSuccess<void>>(
            relationshipApiUrl(`/relationships/${relationshipId}`)
        )
        return response.data
    },
}

// Tag

export type TagRequest = {
    taggerId: string
    taggedId: string
    tagType: string
}

export type TagResponse = {
    taggerId: string
    taggedId: string
    tagType: string
}

export const tagService = {
    // Create a tag
    createTag: async (payload: TagRequest): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.post<ResponseSuccess<void>>(
            relationshipApiUrl("/tags"),
            payload
        )
        return response.data
    },

    // Get tags by type
    getTagsByType: async (type: string): Promise<ResponseSuccess<TagResponse[]>> => {
        const response = await axiosClient.get<ResponseSuccess<TagResponse[]>>(
            relationshipApiUrl(`/tags/type/${type}`)
        )
        return response.data
    },

    // Get tags for a specific user
    getTagsByUserId: async (userId: string): Promise<ResponseSuccess<TagResponse[]>> => {
        const response = await axiosClient.get<ResponseSuccess<TagResponse[]>>(
            relationshipApiUrl(`/tags/user/${userId}`)
        )
        return response.data
    },

    // Update a tag
    updateTag: async (payload: TagRequest): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.put<ResponseSuccess<void>>(
            relationshipApiUrl("/tags"),
            payload
        )
        return response.data
    },

    // Delete a tag
    deleteTag: async (tagId: string): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.delete<ResponseSuccess<void>>(
            relationshipApiUrl(`/tags/${tagId}`)
        )
        return response.data
    },
}



