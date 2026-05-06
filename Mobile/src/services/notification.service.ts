import axiosClient from '@/configurations/axios.config';
import { API_PREFIXES } from '@/constants/api-prefixes';
import type { PageResponse, ResponseSuccess } from '@/types/api-response';
import type { NotificationItem } from '@/types/notification';

const NOTIFICATION_PREFIX = API_PREFIXES.notifications;

export const notificationService = {
  listMyNotifications: async (page = 1, limit = 20) => {
    const { data } = await axiosClient.get<ResponseSuccess<PageResponse<NotificationItem>>>(
      `${NOTIFICATION_PREFIX}`,
      { params: { page, limit } }
    );
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await axiosClient.get<ResponseSuccess<number>>(`${NOTIFICATION_PREFIX}/unread-count`);
    return data;
  },

  markAsRead: async (notificationId: number) => {
    const { data } = await axiosClient.patch<ResponseSuccess<void>>(
      `${NOTIFICATION_PREFIX}/${encodeURIComponent(String(notificationId))}/read`
    );
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await axiosClient.patch<ResponseSuccess<void>>(`${NOTIFICATION_PREFIX}/read-all`);
    return data;
  },
};
