package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class AskAiAssistantThreadRequest {
    @NotBlank(message = "query không được để trống")
    private String query;
    private String scope;
    private String conversationId;
    private List<String> conversationIds;
    private Integer limit;
}
