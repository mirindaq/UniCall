package iuh.fit.identity_service.clients;

import iuh.fit.common_service.exceptions.UnauthenticatedException;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class KeycloakIdentityClient {
    private final WebClient keycloakWebClient;

    @Value("${app.security.keycloak.realm}")
    private String realm;

    @Value("${app.security.keycloak.client-id}")
    private String authClientId;

    @Value("${app.security.keycloak.client-secret:}")
    private String authClientSecret;

    @Value("${app.security.keycloak.redirect-uri}")
    private String redirectUri;

    public AuthTokenResponse exchangeAuthorizationCode(String code, String codeVerifier) {
        try {
            Map<String, Object> tokenMap = requestToken(BodyInserters.fromFormData("client_id", authClientId)
                    .with("grant_type", "authorization_code")
                    .with("code", code)
                    .with("redirect_uri", redirectUri)
                    .with("code_verifier", codeVerifier));
            return toAuthTokenResponse(tokenMap);
        } catch (WebClientResponseException.BadRequest | WebClientResponseException.Unauthorized e) {
            throw new UnauthenticatedException("Authorization code is invalid or expired");
        }
    }

    public AuthTokenResponse refreshToken(String refreshToken) {
        try {
            Map<String, Object> tokenMap = requestToken(BodyInserters.fromFormData("client_id", authClientId)
                    .with("grant_type", "refresh_token")
                    .with("refresh_token", refreshToken));
            return toAuthTokenResponse(tokenMap);
        } catch (WebClientResponseException.BadRequest | WebClientResponseException.Unauthorized e) {
            throw new UnauthenticatedException("Refresh token is invalid or expired");
        }
    }

    public void revokeRefreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        BodyInserters.FormInserter<String> form = BodyInserters.fromFormData("client_id", authClientId)
                .with("token", refreshToken)
                .with("token_type_hint", "refresh_token");
        if (authClientSecret != null && !authClientSecret.isBlank()) {
            form = form.with("client_secret", authClientSecret);
        }

        keycloakWebClient.post()
                .uri("/realms/{realm}/protocol/openid-connect/revoke", realm)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .toBodilessEntity()
                .block();
    }

    private @Nullable Map requestToken(BodyInserters.FormInserter<String> formData) {
        BodyInserters.FormInserter<String> finalForm = formData;
        if (authClientSecret != null && !authClientSecret.isBlank()) {
            finalForm = finalForm.with("client_secret", authClientSecret);
        }

        return keycloakWebClient.post()
                .uri("/realms/{realm}/protocol/openid-connect/token", realm)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(finalForm)
                .retrieve()
                .bodyToMono(Map.class)
                .cast(Map.class)
                .block();
    }

    private AuthTokenResponse toAuthTokenResponse(Map<String, Object> tokenMap) {
        return AuthTokenResponse.builder()
                .accessToken((String) tokenMap.get("access_token"))
                .refreshToken((String) tokenMap.get("refresh_token"))
                .tokenType((String) tokenMap.get("token_type"))
                .expiresIn(toInt(tokenMap.get("expires_in")))
                .refreshExpiresIn(toInt(tokenMap.get("refresh_expires_in")))
                .scope((String) tokenMap.get("scope"))
                .build();
    }

    private Integer toInt(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        return Integer.parseInt(value.toString());
    }
}
