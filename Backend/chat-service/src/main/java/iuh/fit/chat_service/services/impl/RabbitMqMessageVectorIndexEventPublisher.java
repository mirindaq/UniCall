package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.events.MessageVectorIndexEvent;
import iuh.fit.chat_service.services.MessageVectorIndexEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class RabbitMqMessageVectorIndexEventPublisher implements MessageVectorIndexEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${app.ai-assistant.vector-search.rabbitmq.exchange}")
    private String exchange;

    @Value("${app.ai-assistant.vector-search.rabbitmq.routing-key}")
    private String routingKey;

    @Override
    public void publish(MessageVectorIndexEvent event) {
        if (event == null
                || event.getAction() == null
                || !StringUtils.hasText(event.getMessageId())) {
            return;
        }
        log.info(
                "Publish vector-index event: action={}, messageId={}, conversationId={}, exchange={}, routingKey={}",
                event.getAction(),
                event.getMessageId(),
                event.getConversationId(),
                exchange,
                routingKey
        );
        rabbitTemplate.convertAndSend(exchange, routingKey, event);
    }
}
