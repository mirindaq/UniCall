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
public class AccessTokenResponse {
    private String accessToken;
    private String tokenType;
    private Integer expiresIn;
    private String scope;
}
