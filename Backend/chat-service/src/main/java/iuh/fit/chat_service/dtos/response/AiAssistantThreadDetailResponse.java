package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.AiAssistantThread;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AiAssistantThreadDetailResponse {
    private String idThread;
    private String title;
    private String defaultConversationId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<AiAssistantTurnResponse> turns;

    public static AiAssistantThreadDetailResponse from(AiAssistantThread thread) {
        if (thread == null) {
            return null;
        }
        List<AiAssistantTurnResponse> turns = thread.getTurns() == null
                ? List.of()
                : thread.getTurns().stream()
                .map(AiAssistantTurnResponse::from)
                .filter(item -> item != null)
                .toList();
        return AiAssistantThreadDetailResponse.builder()
                .idThread(thread.getIdThread())
                .title(thread.getTitle())
                .defaultConversationId(thread.getDefaultConversationId())
                .createdAt(thread.getCreatedAt())
                .updatedAt(thread.getUpdatedAt())
                .turns(turns)
                .build();
    }
}
