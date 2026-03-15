package iuh.fit.identity_service.dtos.response.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterResponse {
    private String userId;
    private String phoneNumber;
    private String fullName;
    private String gender;
    private LocalDate dateOfBirth;
    private String message;
}
