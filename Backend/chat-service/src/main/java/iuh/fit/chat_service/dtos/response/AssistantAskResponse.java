package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.enums.ChatAssistantIntent;
import iuh.fit.chat_service.enums.ChatAssistantTool;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AssistantAskResponse {
    private String threadId;
    private String question;
    private ChatAssistantIntent intent;
    private List<ChatAssistantTool> toolsUsed;
    private String answer;
    private Object data;
    private Map<String, Object> metadata;
}
