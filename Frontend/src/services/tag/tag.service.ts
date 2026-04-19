import axiosClient from "@/configurations/axios.config"
import { API_PREFIXES } from "@/constants/api-prefixes"
import type { ResponseSuccess } from "@/types/api-response"

const TAG_API_PREFIX = API_PREFIXES.tag

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
            `${TAG_API_PREFIX}`,
            payload
        )
        return response.data
    },

    // Get tags by type
    getTagsByType: async (type: string): Promise<ResponseSuccess<TagResponse[]>> => {
        const response = await axiosClient.get<ResponseSuccess<TagResponse[]>>(
            `${TAG_API_PREFIX}/type/${type}`
        )
        return response.data
    },

    // Get tag for a specific user
    getTagsByUserId: async (userId: string): Promise<ResponseSuccess<TagResponse>> => {
        const response = await axiosClient.get<ResponseSuccess<TagResponse>>(
            `${TAG_API_PREFIX}/user/${userId}`
        )
        return response.data
    },

    // Update a tag
    updateTag: async (payload: TagRequest): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.put<ResponseSuccess<void>>(
            `${TAG_API_PREFIX}`,
            payload
        )
        return response.data
    },

    // Delete a tag
    deleteTag: async (tagId: string): Promise<ResponseSuccess<void>> => {
        const response = await axiosClient.delete<ResponseSuccess<void>>(
            `${TAG_API_PREFIX}/${tagId}`
        )
        return response.data
    },
}
