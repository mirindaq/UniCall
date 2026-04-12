package iuh.fit.user_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RequestAccountDeletionRequest {
    @NotBlank(message = "phoneNumber is required")
    @Size(max = 20, message = "phoneNumber must be at most 20 characters")
    private String phoneNumber;

    @NotBlank(message = "reason is required")
    @Size(max = 200, message = "reason must be at most 200 characters")
    private String reason;

    @NotBlank(message = "password is required")
    @Size(max = 255, message = "password must be at most 255 characters")
    private String password;
}
