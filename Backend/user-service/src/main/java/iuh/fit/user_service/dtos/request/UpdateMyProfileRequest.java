package iuh.fit.user_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UpdateMyProfileRequest {
    @NotBlank(message = "firstName is required")
    @Size(max = 100, message = "firstName cannot exceed 100 characters")
    private String firstName;

    @NotBlank(message = "lastName is required")
    @Size(max = 100, message = "lastName cannot exceed 100 characters")
    private String lastName;

    @NotBlank(message = "gender is required")
    @Size(max = 20, message = "gender cannot exceed 20 characters")
    private String gender;

    @NotNull(message = "dateOfBirth is required")
    private LocalDate dateOfBirth;
}
