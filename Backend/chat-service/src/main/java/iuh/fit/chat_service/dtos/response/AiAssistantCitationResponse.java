package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.AiAssistantThread;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AiAssistantCitationResponse {
    private String messageId;
    private String conversationId;
    private String senderIdentityUserId;
    private LocalDateTime timeSent;
    private String snippet;
    private double score;

    public static AiAssistantCitationResponse from(AiAssistantThread.Citation citation) {
        if (citation == null) {
            return null;
        }
        return AiAssistantCitationResponse.builder()
                .messageId(citation.getMessageId())
                .conversationId(citation.getConversationId())
                .senderIdentityUserId(citation.getSenderIdentityUserId())
                .timeSent(citation.getTimeSent())
                .snippet(citation.getSnippet())
                .score(citation.getScore())
                .build();
    }
}
