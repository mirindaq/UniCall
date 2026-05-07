package iuh.fit.notification_service.dtos.response;

import java.time.LocalDateTime;

import iuh.fit.notification_service.entities.Notification;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationResponse {
    private Long id;
    private String type;
    private String conversationId;
    private String conversationName;
    private String title;
    private String content;
    private boolean read;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification entity) {
        return NotificationResponse.builder()
                .id(entity.getId())
                .type(entity.getType())
                .conversationId(entity.getConversationId())
                .conversationName(entity.getConversationName())
                .title(entity.getTitle())
                .content(entity.getContent())
                .read(entity.isRead())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
