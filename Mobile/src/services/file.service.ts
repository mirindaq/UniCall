import axiosClient from '@/configurations/axios.config';
import { API_PREFIXES } from '@/constants/api-prefixes';
import type { ResponseSuccess } from '@/types/api-response';
import type { AttachmentType } from '@/types/chat';

const CHAT_PREFIX = API_PREFIXES.chat;

export interface FileUploadResponse {
  url: string;
  fileSize: number;
  type: AttachmentType;
  contentType: string;
}

export interface AttachmentResponse {
  idAttachment: string;
  type: AttachmentType;
  url: string;
  fileName?: string;
  size?: string;
  timeUpload: string;
  timeSent?: string;
  messageId: string;
  senderId?: string;
  senderName?: string;
}

export type AttachmentQuery = {
  type?: 'images' | 'files' | 'links';
  senderId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
};

const guessMimeType = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
};

export const fileService = {
  uploadFileFromUri: async (
    fileUri: string,
    options?: { fileName?: string; mimeType?: string }
  ): Promise<ResponseSuccess<FileUploadResponse>> => {
    const fallbackName = `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const fileName = options?.fileName ?? fileUri.split('/').pop() ?? fallbackName;
    const mimeType = options?.mimeType ?? guessMimeType(fileName);

    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);

    const { data } = await axiosClient.post<ResponseSuccess<FileUploadResponse>>(
      `${CHAT_PREFIX}/upload-file`,
      form,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return data;
  },

  getAttachments: async (
    conversationId: string,
    query?: AttachmentQuery | AttachmentQuery['type']
  ): Promise<ResponseSuccess<AttachmentResponse[]>> => {
    const params = typeof query === 'string' ? { type: query } : query ?? {};

    const { data } = await axiosClient.get<ResponseSuccess<AttachmentResponse[]>>(
      `${CHAT_PREFIX}/conversations/${encodeURIComponent(conversationId)}/attachments`,
      { params }
    );

    return data;
  },
};

