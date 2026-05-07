package iuh.fit.chat_service.dtos.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ConversationBlockStatusResponse {
    private String conversationId;
    private String directPeerId;
    private boolean blocked;
    private boolean blockedByMe;
    private boolean blockedByOther;
    private LocalDateTime blockedAt;
}

