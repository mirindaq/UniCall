package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateGroupAvatarRequest {
    @NotBlank(message = "avatar is required")
    private String avatar;
}
