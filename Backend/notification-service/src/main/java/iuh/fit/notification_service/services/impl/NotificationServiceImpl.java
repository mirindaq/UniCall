package iuh.fit.notification_service.services.impl;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import iuh.fit.notification_service.dtos.response.NotificationResponse;
import iuh.fit.notification_service.entities.Notification;
import iuh.fit.notification_service.repositories.NotificationRepository;
import iuh.fit.notification_service.services.NotificationService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notificationRepository;

    @Override
    public PageResponse<NotificationResponse> listMyNotifications(String identityUserId, int page, int limit) {
        String normalizedUserId = normalizeIdentityUserId(identityUserId);
        int safePage = Math.max(page, 1);
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        var result = notificationRepository.findByIdentityUserIdOrderByCreatedAtDesc(
                normalizedUserId,
                PageRequest.of(safePage - 1, safeLimit));
        return PageResponse.fromPage(result, NotificationResponse::from);
    }

    @Override
    public long countMyUnread(String identityUserId) {
        return notificationRepository.countByIdentityUserIdAndReadFalse(normalizeIdentityUserId(identityUserId));
    }

    @Override
    public void markAsRead(String identityUserId, Long notificationId) {
        if (notificationId == null || notificationId <= 0) {
            throw new InvalidParamException("Notification id is required");
        }

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        String normalizedUserId = normalizeIdentityUserId(identityUserId);
        if (!normalizedUserId.equals(notification.getIdentityUserId())) {
            throw new ResourceNotFoundException("Notification not found");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    @Override
    public void markAllAsRead(String identityUserId) {
        var result = notificationRepository.findByIdentityUserIdOrderByCreatedAtDesc(
                normalizeIdentityUserId(identityUserId),
                PageRequest.of(0, 500));
        var changed = false;
        for (Notification notification : result.getContent()) {
            if (!notification.isRead()) {
                notification.setRead(true);
                changed = true;
            }
        }
        if (changed) {
            notificationRepository.saveAll(result.getContent());
        }
    }

    private String normalizeIdentityUserId(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Missing authenticated user header");
        }
        return identityUserId.trim();
    }
}
