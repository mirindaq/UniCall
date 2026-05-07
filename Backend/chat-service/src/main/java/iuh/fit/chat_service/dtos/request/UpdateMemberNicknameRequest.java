package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateMemberNicknameRequest {
    @Size(max = 50, message = "Nickname must be at most 50 characters")
    private String nickname;
}
