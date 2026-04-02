package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateDirectConversationRequest {
    @NotBlank(message = "otherUserId không được để trống")
    private String otherUserId;
}
