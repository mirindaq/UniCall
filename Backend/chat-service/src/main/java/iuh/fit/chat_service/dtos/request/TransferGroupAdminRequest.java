package iuh.fit.chat_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransferGroupAdminRequest {
    @NotBlank(message = "Target identity user id is required")
    private String targetIdentityUserId;
}

