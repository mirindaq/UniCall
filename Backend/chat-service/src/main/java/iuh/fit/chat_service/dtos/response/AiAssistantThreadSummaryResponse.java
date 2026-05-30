package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.AiAssistantThread;
import iuh.fit.chat_service.enums.AiThreadRole;
import lombok.Builder;
import lombok.Data;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AiAssistantThreadSummaryResponse {
    private String idThread;
    private String title;
    private String defaultConversationId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String lastAssistantMessage;

    public static AiAssistantThreadSummaryResponse from(AiAssistantThread thread) {
        if (thread == null) {
            return null;
        }

        String lastAssistantMessage = null;
        List<AiAssistantThread.Turn> turns = thread.getTurns();
        if (turns != null && !turns.isEmpty()) {
            for (int i = turns.size() - 1; i >= 0; i--) {
                AiAssistantThread.Turn turn = turns.get(i);
                if (turn == null || turn.getRole() != AiThreadRole.ASSISTANT) {
                    continue;
                }
                if (!StringUtils.hasText(turn.getContent())) {
                    continue;
                }
                lastAssistantMessage = turn.getContent().trim();
                break;
            }
        }

        return AiAssistantThreadSummaryResponse.builder()
                .idThread(thread.getIdThread())
                .title(thread.getTitle())
                .defaultConversationId(thread.getDefaultConversationId())
                .createdAt(thread.getCreatedAt())
                .updatedAt(thread.getUpdatedAt())
                .lastAssistantMessage(lastAssistantMessage)
                .build();
    }
}
