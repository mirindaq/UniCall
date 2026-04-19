package iuh.fit.chat_service.dtos.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DissolveGroupConversationResponse {
    private String idConversation;
    private Boolean dissolved;
    private LocalDateTime dissolvedAt;
}

