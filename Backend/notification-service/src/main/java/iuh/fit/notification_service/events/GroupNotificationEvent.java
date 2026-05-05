package iuh.fit.notification_service.events;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Data;

@Data
public class GroupNotificationEvent {
    private String eventId;
    private GroupNotificationEventType type;
    private LocalDateTime occurredAt;
    private String actorId;
    private List<String> targetUserIds;
    private List<String> recipientUserIds;
    private String conversationId;
    private String conversationName;
    private String content;
}
