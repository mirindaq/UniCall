package iuh.fit.identity_service.dtos.response.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthTokenResponse {
    private String accessToken;

    private String refreshToken;

    private String tokenType;

    private Integer expiresIn;

    private Integer refreshExpiresIn;

    private String scope;
}
