package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreateGroupConversationRequest {
    @NotBlank(message = "Group name is required")
    private String name;

    @NotEmpty(message = "At least one member is required")
    private List<@NotBlank(message = "Member identityUserId is required") String> memberIdentityUserIds;
}
