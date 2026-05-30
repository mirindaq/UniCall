package iuh.fit.chat_service.dtos.request;

import lombok.Data;

@Data
public class CreateAiAssistantThreadRequest {
    private String title;
    private String conversationId;
}
