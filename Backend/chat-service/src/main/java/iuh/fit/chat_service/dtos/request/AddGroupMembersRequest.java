package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AddGroupMembersRequest {
    @NotNull(message = "Member list is required")
    @NotEmpty(message = "Member list must not be empty")
    private List<String> memberIdentityUserIds;
}

