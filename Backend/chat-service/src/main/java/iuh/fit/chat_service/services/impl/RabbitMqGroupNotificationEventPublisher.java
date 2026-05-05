package iuh.fit.chat_service.services.impl;

import java.util.Locale;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import iuh.fit.chat_service.events.GroupNotificationEvent;
import iuh.fit.chat_service.services.GroupNotificationEventPublisher;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RabbitMqGroupNotificationEventPublisher implements GroupNotificationEventPublisher {
    private final RabbitTemplate rabbitTemplate;

    @Value("${app.notification.exchange}")
    private String exchange;

    @Value("${app.notification.routing-key-prefix}")
    private String routingKeyPrefix;

    @Override
    public void publish(GroupNotificationEvent event) {
        if (event == null || event.getType() == null) {
            return;
        }

        String routingKey = routingKeyPrefix + "." + event.getType().name().toLowerCase(Locale.ROOT);
        rabbitTemplate.convertAndSend(exchange, routingKey, event);
    }
}
