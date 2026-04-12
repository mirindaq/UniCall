package iuh.fit.user_service.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdatePhoneSearchPrivacyRequest {
    @NotNull(message = "allowPhoneSearch is required")
    private Boolean allowPhoneSearch;
}
