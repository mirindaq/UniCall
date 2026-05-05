package iuh.fit.notification_service.services;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.notification_service.dtos.response.NotificationResponse;

public interface NotificationService {
    PageResponse<NotificationResponse> listMyNotifications(String identityUserId, int page, int limit);

    long countMyUnread(String identityUserId);

    void markAsRead(String identityUserId, Long notificationId);

    void markAllAsRead(String identityUserId);
}
