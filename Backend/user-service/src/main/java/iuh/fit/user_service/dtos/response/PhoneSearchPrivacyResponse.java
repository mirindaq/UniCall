package iuh.fit.user_service.dtos.response;

import iuh.fit.user_service.entities.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PhoneSearchPrivacyResponse {
    private String identityUserId;
    private Boolean allowPhoneSearch;

    public static PhoneSearchPrivacyResponse from(User user) {
        return PhoneSearchPrivacyResponse.builder()
                .identityUserId(user.getIdentityUserId())
                .allowPhoneSearch(Boolean.TRUE.equals(user.getAllowPhoneSearch()))
                .build();
    }
}
