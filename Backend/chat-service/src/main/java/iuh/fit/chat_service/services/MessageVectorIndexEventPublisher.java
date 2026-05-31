package iuh.fit.chat_service.services;

import iuh.fit.chat_service.events.MessageVectorIndexEvent;

public interface MessageVectorIndexEventPublisher {
    void publish(MessageVectorIndexEvent event);
}

