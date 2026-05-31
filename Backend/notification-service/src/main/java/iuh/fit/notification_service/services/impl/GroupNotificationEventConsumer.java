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
            case GROUP_MEMBER_ADDED -> "Thành viên mới trong nhóm";
            case GROUP_MEMBER_LEFT -> "Thành viên đã rời nhóm";
            case GROUP_MEMBER_KICKED -> "Thành viên đã bị xóa khỏi nhóm";
            case TASK_GROUP_MEMBER_ADDED -> "Bạn được thêm vào nhóm công việc";
            case TASK_GROUP_MEMBER_KICKED -> "Bạn đã bị kích khỏi nhóm công việc";
            case TASK_ITEM_ASSIGNED -> "Bạn có công việc mới";
            case TASK_ITEM_UPDATED -> "Công việc được cập nhật";
            case TASK_ITEM_COMMENTED -> "Công việc có bình luận mới";
            case TASK_ITEM_DUE_SOON -> "Công việc sắp đến hạn";
        };
    }

    private String buildContent(GroupNotificationEvent event) {
        String groupName = event.getConversationName() == null || event.getConversationName().isBlank()
                ? "Nhóm"
                : event.getConversationName().trim();

        if (event.getContent() != null && !event.getContent().isBlank()) {
            return groupName + ": " + event.getContent().trim();
        }

        return groupName + ": Có cập nhật thành viên.";
    }
}
