import axiosClient from "@/configurations/axios.config"
import { API_PREFIXES } from "@/constants/api-prefixes"
import type { ResponseSuccess } from "@/types/api-response"

const RELATIONSHIP_API_PREFIX = API_PREFIXES.relationship

export type RelationshipType = string

export type RelationshipRequest = {
    actorId: string
    targetId: string
    relationshipType: RelationshipType[]
}

export type RelationshipResponse = {
    actorId: string
    targetId: string
    relationshipTypes?: RelationshipType[]
}

export const relationshipService = {
    // Create a relationship between two users
    createRelationship: async (payload: RelationshipRequest): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.post<ResponseSuccess<void>>(
            `${RELATIONSHIP_API_PREFIX}`,
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
            `${RELATIONSHIP_API_PREFIX}/${userId1}/${userId2}`
        )
        return response.data
    },

    // Get relationships by type
    getRelationshipsByType: async (type: string): Promise<ResponseSuccess<RelationshipResponse[]>> => {
        const response = await axiosClient.get<ResponseSuccess<RelationshipResponse[]>>(
            `${RELATIONSHIP_API_PREFIX}/${type}`
        )
        return response.data
    },

    // Update a relationship
    updateRelationship: async (payload: RelationshipRequest): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.put<ResponseSuccess<void>>(
            `${RELATIONSHIP_API_PREFIX}`,
            payload
        )
        return response.data
    },

    // Delete a relationship
    deleteRelationship: async (relationshipId: string): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.delete<ResponseSuccess<void>>(
            `${RELATIONSHIP_API_PREFIX}/${relationshipId}`
        )
        return response.data
    },
}



