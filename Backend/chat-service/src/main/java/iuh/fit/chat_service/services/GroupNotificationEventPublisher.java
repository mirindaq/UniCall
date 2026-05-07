package iuh.fit.chat_service.services;

import iuh.fit.chat_service.events.GroupNotificationEvent;

public interface GroupNotificationEventPublisher {
    void publish(GroupNotificationEvent event);
}
