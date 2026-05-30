package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.entities.AiAssistantThread;
import iuh.fit.chat_service.enums.AiThreadRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AiAssistantTurnResponse {
    private String idTurn;
    private AiThreadRole role;
    private String content;
    private LocalDateTime createdAt;
    private List<AiAssistantCitationResponse> citations;

    public static AiAssistantTurnResponse from(AiAssistantThread.Turn turn) {
        if (turn == null) {
            return null;
        }
        List<AiAssistantCitationResponse> citations = turn.getCitations() == null
                ? List.of()
                : turn.getCitations().stream()
                .map(AiAssistantCitationResponse::from)
                .filter(item -> item != null)
                .toList();
        return AiAssistantTurnResponse.builder()
                .idTurn(turn.getIdTurn())
                .role(turn.getRole())
                .content(turn.getContent())
                .createdAt(turn.getCreatedAt())
                .citations(citations)
                .build();
    }
}
