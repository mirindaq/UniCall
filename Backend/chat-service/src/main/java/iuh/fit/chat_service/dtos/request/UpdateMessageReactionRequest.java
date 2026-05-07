package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateMessageReactionRequest {
    @NotBlank(message = "Reaction is required")
    @Size(max = 8, message = "Reaction must be at most 8 characters")
    private String reaction;
}
