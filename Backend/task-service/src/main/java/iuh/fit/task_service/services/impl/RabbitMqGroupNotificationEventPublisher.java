package iuh.fit.task_service.services.impl;

import iuh.fit.task_service.events.GroupNotificationEvent;
import iuh.fit.task_service.services.GroupNotificationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
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
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, event);
        } catch (Exception ex) {
            log.warn(
                    "Không thể publish notification event type={} exchange={} routingKey={} eventId={}",
                    event.getType(), exchange, routingKey, event.getEventId(), ex
            );
        }
    }
}
