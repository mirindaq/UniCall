package iuh.fit.identity_service.dtos.request.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyPasswordRequest {
    @NotBlank(message = "identityUserId is required")
    @Size(max = 100, message = "identityUserId must be at most 100 characters")
    private String identityUserId;

    @NotBlank(message = "phoneNumber is required")
    @Size(max = 20, message = "phoneNumber must be at most 20 characters")
    private String phoneNumber;

    @NotBlank(message = "password is required")
    @Size(max = 255, message = "password must be at most 255 characters")
    private String password;
}
