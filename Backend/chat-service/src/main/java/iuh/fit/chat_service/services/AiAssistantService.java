package iuh.fit.chat_service.services;

import java.util.Optional;

public interface AiAssistantService {
    String UNICALL_MENTION = "@unicall";
    String UNICALL_IMAGE_MENTION = "@unicallimage";
    String UNICALL_BOT_ID = "unicall-ai-bot";
    String UNICALL_IMAGE_BOT_ID = "unicall-image-bot";

    Optional<AiAssistantReply> buildReply(String conversationId, String requesterId, String content);

    record AiAssistantReply(
            String botId,
            String content,
            String imageUrl
    ) {
    }
}

