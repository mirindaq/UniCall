package iuh.fit.notification_service.services.impl;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import iuh.fit.notification_service.entities.Notification;
import iuh.fit.notification_service.events.GroupNotificationEvent;
import iuh.fit.notification_service.repositories.NotificationRepository;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class GroupNotificationEventConsumer {
    private final NotificationRepository notificationRepository;

    @RabbitListener(queues = "${app.notification.queue}")
    public void consume(GroupNotificationEvent event) {
        if (event == null || event.getType() == null || event.getRecipientUserIds() == null) {
            return;
        }

        var uniqueRecipients = new LinkedHashSet<String>();
        for (String recipientId : event.getRecipientUserIds()) {
            if (recipientId != null && !recipientId.isBlank()) {
                uniqueRecipients.add(recipientId.trim());
            }
        }

        if (uniqueRecipients.isEmpty()) {
            return;
        }

        var now = event.getOccurredAt() == null ? LocalDateTime.now() : event.getOccurredAt();
        var notifications = uniqueRecipients.stream().map(recipientId -> {
            Notification notification = new Notification();
            notification.setIdentityUserId(recipientId);
            notification.setType(event.getType().name());
            notification.setEventId(event.getEventId());
            notification.setConversationId(event.getConversationId());
            notification.setConversationName(event.getConversationName());
            notification.setTitle(buildTitle(event));
            notification.setContent(buildContent(event));
            notification.setRead(false);
            notification.setCreatedAt(now);
            return notification;
        }).toList();

        notificationRepository.saveAll(notifications);
    }

    private String buildTitle(GroupNotificationEvent event) {
        return switch (event.getType()) {
            case GROUP_MEMBER_ADDED -> "Thanh vien moi trong nhom";
            case GROUP_MEMBER_LEFT -> "Thanh vien da roi nhom";
            case GROUP_MEMBER_KICKED -> "Thanh vien da bi xoa khoi nhom";
        };
    }

    private String buildContent(GroupNotificationEvent event) {
        String groupName = event.getConversationName() == null || event.getConversationName().isBlank()
                ? "Nhom"
                : event.getConversationName().trim();

        if (event.getContent() != null && !event.getContent().isBlank()) {
            return groupName + ": " + event.getContent().trim();
        }

        return groupName + ": Co cap nhat thanh vien.";
    }
}
