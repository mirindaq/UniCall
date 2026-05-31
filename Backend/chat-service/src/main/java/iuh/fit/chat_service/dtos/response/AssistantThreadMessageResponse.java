package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.enums.AssistantMessageRole;
import iuh.fit.chat_service.enums.ChatAssistantIntent;
import iuh.fit.chat_service.enums.ChatAssistantTool;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class AssistantThreadMessageResponse {
    private String id;
    private AssistantMessageRole role;
    private String content;
    private ChatAssistantIntent intent;
    private List<ChatAssistantTool> toolsUsed;
    private Object data;
    private LocalDateTime createdAt;
}
