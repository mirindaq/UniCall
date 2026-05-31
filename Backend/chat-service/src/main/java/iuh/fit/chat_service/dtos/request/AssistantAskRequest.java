package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssistantAskRequest {
    @NotBlank(message = "message không được để trống")
    private String message;
}
