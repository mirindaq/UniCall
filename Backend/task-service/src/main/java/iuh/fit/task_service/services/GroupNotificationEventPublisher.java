package iuh.fit.task_service.services;

import iuh.fit.task_service.events.GroupNotificationEvent;

public interface GroupNotificationEventPublisher {
    void publish(GroupNotificationEvent event);
}
