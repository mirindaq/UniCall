package iuh.fit.identity_service.dtos.request.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordWithOtpRequest {
    @NotBlank(message = "Phone number is required")
    @Pattern(
            regexp = "^(0|\\+84)\\d{9}$",
            message = "Phone number must be valid Vietnam format"
    )
    private String phoneNumber;

    @NotBlank(message = "Firebase OTP token is required")
    private String firebaseIdToken;

    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "New password must be at least 8 characters")
    private String newPassword;
}
