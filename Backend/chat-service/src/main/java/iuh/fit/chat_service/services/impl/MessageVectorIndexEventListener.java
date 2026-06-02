package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.events.MessageVectorIndexAction;
import iuh.fit.chat_service.events.MessageVectorIndexEvent;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.chat_service.services.ConversationMessageVectorService;
import iuh.fit.common_service.observability.TraceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageVectorIndexEventListener {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMessageVectorService conversationMessageVectorService;

    @RabbitListener(queues = "${app.ai-assistant.vector-search.rabbitmq.queue}")
    public void consume(
            MessageVectorIndexEvent event,
            @Header(name = TraceContext.RABBIT_HEADER, required = false) String traceId
    ) {
        try (TraceContext.Scope ignored = TraceContext.open(traceId)) {
            consumeWithTrace(event);
        }
    }

    private void consumeWithTrace(MessageVectorIndexEvent event) {
        if (event == null || event.getAction() == null || !StringUtils.hasText(event.getMessageId())) {
            return;
        }

        String messageId = event.getMessageId().trim();
        log.info(
                "Consume vector-index event: action={}, messageId={}, conversationId={}",
                event.getAction(),
                messageId,
                event.getConversationId()
        );
        try {
            if (event.getAction() == MessageVectorIndexAction.DELETE) {
                conversationMessageVectorService.deleteMessage(messageId);
                log.info("Vector delete completed: messageId={}", messageId);
                return;
            }

            Message message = messageRepository.findById(messageId).orElse(null);
            if (message == null) {
                log.warn("Vector upsert skipped: message not found for messageId={}", messageId);
                return;
            }
            Conversation conversation = conversationRepository.findById(message.getIdConversation()).orElse(null);
            conversationMessageVectorService.upsertMessage(message, conversation);
            log.info("Vector upsert completed: messageId={}, conversationId={}", messageId, message.getIdConversation());
        } catch (Exception ex) {
            log.warn("Vector index worker failed for messageId={}: {}", messageId, ex.getMessage());
        }
    }
}
