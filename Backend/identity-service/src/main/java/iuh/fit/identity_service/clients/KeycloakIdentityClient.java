package iuh.fit.identity_service.clients;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.UnauthenticatedException;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriBuilder;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
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

    @Value("${app.security.keycloak.activation-email-lifespan-seconds:86400}")
    private int activationEmailLifespanSeconds;

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
                                    if (body.contains("email")) {
                                        return Mono.error(new ConflictException("Email already exists"));
                                    }
                                    return Mono.error(new ConflictException("User already exists"));
                                });
                    }

                    return response.createException().flatMap(Mono::error);
                })
                .block();
    }

    public void sendAccountActivationEmail(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }

        String token = getAdminToken();
        sendExecuteActionsEmail(userId, token, List.of("VERIFY_EMAIL"));
    }

    public void resendVerificationEmail(String phoneNumber, String email) {
        if (phoneNumber == null || phoneNumber.isBlank() || email == null || email.isBlank()) {
            throw new InvalidParamException("Phone number and email are required");
        }

        String token = getAdminToken();
        Map<String, Object> user = findUserByUsername(phoneNumber, token);
        if (user == null) {
            throw new InvalidParamException("Phone number or email is invalid");
        }

        String userEmail = asString(user.get("email"));
        if (userEmail == null || !userEmail.equalsIgnoreCase(email.trim())) {
            throw new InvalidParamException("Phone number or email is invalid");
        }

        boolean emailVerified = Boolean.TRUE.equals(user.get("emailVerified"));
        if (emailVerified) {
            throw new InvalidParamException("Account email is already verified");
        }

        String userId = asString(user.get("id"));
        if (userId == null || userId.isBlank()) {
            throw new InvalidParamException("User account is invalid");
        }

        sendAccountActivationEmail(userId);
    }

    public String findUserIdByPhoneAndEmail(String phoneNumber, String email) {
        if (phoneNumber == null || phoneNumber.isBlank() || email == null || email.isBlank()) {
            throw new InvalidParamException("Phone number and email are required");
        }

        String token = getAdminToken();
        Map<String, Object> user = findUserByUsername(phoneNumber, token);
        if (user == null) {
            throw new InvalidParamException("Phone number or email is invalid");
        }

        String userEmail = asString(user.get("email"));
        if (userEmail == null || !userEmail.equalsIgnoreCase(email.trim())) {
            throw new InvalidParamException("Phone number or email is invalid");
        }

        String userId = asString(user.get("id"));
        if (userId == null || userId.isBlank()) {
            throw new InvalidParamException("User account is invalid");
        }

        return userId;
    }

    public void sendPasswordResetEmail(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        String token = getAdminToken();
        sendExecuteActionsEmail(userId, token, List.of("UPDATE_PASSWORD"));
    }

    public void forgotPassword(String phoneNumber, String email) {
        String userId = findUserIdByPhoneAndEmail(phoneNumber, email);
        sendPasswordResetEmail(userId);
    }

    public void changePassword(String phoneNumber, String currentPassword, String newPassword) {
        if (phoneNumber == null || phoneNumber.isBlank()
                || currentPassword == null || currentPassword.isBlank()
                || newPassword == null || newPassword.isBlank()) {
            throw new InvalidParamException("Phone number, current password and new password are required");
        }
        if (currentPassword.equals(newPassword)) {
            throw new InvalidParamException("New password must be different from current password");
        }

        try {
            requestPasswordToken(phoneNumber, currentPassword);
        } catch (WebClientResponseException.BadRequest | WebClientResponseException.Unauthorized ex) {
            throw new UnauthenticatedException("Current password is incorrect");
        }

        String adminToken = getAdminToken();
        Map<String, Object> user = findUserByUsername(phoneNumber, adminToken);
        if (user == null) {
            throw new InvalidParamException("User account is invalid");
        }
        String userId = asString(user.get("id"));
        if (userId == null || userId.isBlank()) {
            throw new InvalidParamException("User account is invalid");
        }

        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", newPassword);
        credential.put("temporary", false);

        keycloakWebClient.put()
                .uri("/admin/realms/{realm}/users/{id}/reset-password", realm, userId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(credential)
                .retrieve()
                .toBodilessEntity()
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
            Map<String, Object> tokenMap = requestPasswordToken(phoneNumber, password);
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

    private @Nullable Map<String, Object> requestPasswordToken(String phoneNumber, String password) {
        return requestToken(BodyInserters.fromFormData("client_id", authClientId)
                .with("grant_type", "password")
                .with("username", phoneNumber)
                .with("password", password));
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
        user.put("email", request.getEmail());
        user.put("firstName", request.getFirstName());
        user.put("lastName", request.getLastName());
        user.put("enabled", true);
        user.put("emailVerified", true);
        user.put("requiredActions", List.of());
        user.put("attributes", Map.of(
                "phoneNumber", List.of(request.getPhoneNumber()),
                "email", List.of(request.getEmail()),
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

    private java.net.URI buildActivationEmailUri(UriBuilder uriBuilder, String userId) {
        return uriBuilder
                .path("/admin/realms/{realm}/users/{id}/execute-actions-email")
                .queryParam("lifespan", activationEmailLifespanSeconds)
                .build(realm, userId);
    }

    private void sendExecuteActionsEmail(String userId, String adminToken, List<String> actions) {
        keycloakWebClient.put()
                .uri(uriBuilder -> buildActivationEmailUri(uriBuilder, userId))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(actions)
                .retrieve()
                .toBodilessEntity()
                .block();
    }

    private boolean isAccountNotFullySetUpError(WebClientResponseException ex) {
        String body = ex.getResponseBodyAsString();
        if (body == null) {
            return false;
        }
        return body.toLowerCase(Locale.ROOT).contains("account is not fully set up");
    }

    private boolean cleanupVerifyEmailActionIfNeeded(String phoneNumber) {
        String token = getAdminToken();
        Map<String, Object> user = findUserByUsername(phoneNumber, token);
        if (user == null) {
            return false;
        }

        String userId = asString(user.get("id"));
        if (userId == null || userId.isBlank()) {
            return false;
        }

        boolean emailVerified = Boolean.TRUE.equals(user.get("emailVerified"));
        List<String> requiredActions = toStringList(user.get("requiredActions"));
        if (!emailVerified || requiredActions.stream().noneMatch("VERIFY_EMAIL"::equals)) {
            return false;
        }

        List<String> updatedActions = requiredActions.stream()
                .filter(action -> !"VERIFY_EMAIL".equals(action))
                .toList();

        Map<String, Object> payload = new HashMap<>();
        putIfPresent(payload, "username", user.get("username"));
        putIfPresent(payload, "email", user.get("email"));
        putIfPresent(payload, "firstName", user.get("firstName"));
        putIfPresent(payload, "lastName", user.get("lastName"));
        payload.put("enabled", user.getOrDefault("enabled", Boolean.TRUE));
        payload.put("emailVerified", true);
        payload.put("requiredActions", updatedActions);
        if (user.get("attributes") != null) {
            payload.put("attributes", user.get("attributes"));
        }

        keycloakWebClient.put()
                .uri("/admin/realms/{realm}/users/{id}", realm, userId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .toBodilessEntity()
                .block();
        return true;
    }

    private Map<String, Object> findUserByUsername(String username, String adminToken) {
        List<Map<String, Object>> users = keycloakWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/admin/realms/{realm}/users")
                        .queryParam("username", username)
                        .queryParam("exact", true)
                        .build(realm))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .retrieve()
                .bodyToMono(new org.springframework.core.ParameterizedTypeReference<List<Map<String, Object>>>() {})
                .block();

        if (users == null || users.isEmpty()) {
            return null;
        }
        return users.get(0);
    }

    private List<String> toStringList(Object value) {
        if (!(value instanceof List<?> rawList)) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (Object item : rawList) {
            if (item != null) {
                result.add(item.toString());
            }
        }
        return result;
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }
}
