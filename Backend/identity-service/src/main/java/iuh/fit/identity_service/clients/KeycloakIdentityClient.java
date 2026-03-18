package iuh.fit.identity_service.clients;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
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

    @Value("${app.security.keycloak.admin-client-id}")
    private String adminClientId;

    @Value("${app.security.keycloak.admin-client-secret}")
    private String adminClientSecret;

    public String createUser(RegisterRequest request) {
        String token = getAdminToken();

        return keycloakWebClient.post()
                .uri("/admin/realms/{realm}/users", realm)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(buildUser(request))
                .exchangeToMono(response -> {
                    if (response.statusCode().value() == 201) {
                        String location = response.headers().asHttpHeaders().getFirst(HttpHeaders.LOCATION);
                        if (location == null || location.isBlank()) {
                            return Mono.error(new IllegalStateException("Missing user location from Keycloak"));
                        }
                        return Mono.just(location.substring(location.lastIndexOf('/') + 1));
                    }

                    if (response.statusCode().value() == 409) {
                        return response.bodyToMono(String.class)
                                .flatMap(body -> {
                                    if (body.contains("username")) {
                                        return Mono.error(new ConflictException("Phone number already exists"));
                                    }
                                    return Mono.error(new ConflictException("User already exists"));
                                });
                    }

                    return response.createException().flatMap(Mono::error);
                })
                .block();
    }

    public void deleteUser(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        String token = getAdminToken();
        keycloakWebClient.delete()
                .uri("/admin/realms/{realm}/users/{id}", realm, userId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .toBodilessEntity()
                .block();
    }

    public AuthTokenResponse login(String phoneNumber, String password) {
        try {
            Map<String, Object> tokenMap = requestToken(BodyInserters.fromFormData("client_id", authClientId)
                    .with("grant_type", "password")
                    .with("username", phoneNumber)
                    .with("password", password));
            return toAuthTokenResponse(tokenMap);
        } catch (WebClientResponseException.BadRequest | WebClientResponseException.Unauthorized e) {
            throw new UnauthenticatedException("Phone number or password is invalid");
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

    private @Nullable Map<String, Object> requestToken(BodyInserters.FormInserter<String> formData) {
        BodyInserters.FormInserter<String> finalForm = formData;
        if (authClientSecret != null && !authClientSecret.isBlank()) {
            finalForm = finalForm.with("client_secret", authClientSecret);
        }

        return keycloakWebClient.post()
                .uri("/realms/{realm}/protocol/openid-connect/token", realm)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(finalForm)
                .retrieve()
                .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {})
                .block();
    }

    private String getAdminToken() {
        Map<String, Object> tokenMap = keycloakWebClient.post()
                .uri("/realms/{realm}/protocol/openid-connect/token", realm)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData("client_id", adminClientId)
                        .with("client_secret", adminClientSecret)
                        .with("grant_type", "client_credentials"))
                .retrieve()
                .bodyToMono(new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {})
                .block();

        if (tokenMap == null || tokenMap.get("access_token") == null) {
            throw new IllegalStateException("Unable to obtain admin token from Keycloak");
        }
        return tokenMap.get("access_token").toString();
    }

    private Map<String, Object> buildUser(RegisterRequest request) {
        Map<String, Object> user = new HashMap<>();
        user.put("username", request.getPhoneNumber());
        user.put("firstName", request.getFirstName());
        user.put("lastName", request.getLastName());
        user.put("enabled", true);
        user.put("emailVerified", false);
        user.put("attributes", Map.of(
                "phoneNumber", List.of(request.getPhoneNumber()),
                "gender", List.of(request.getGender()),
                "dateOfBirth", List.of(request.getDateOfBirth().toString())
        ));
        user.put("credentials", List.of(
                Map.of(
                        "type", "password",
                        "value", request.getPassword(),
                        "temporary", false
                )
        ));
        return user;
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
