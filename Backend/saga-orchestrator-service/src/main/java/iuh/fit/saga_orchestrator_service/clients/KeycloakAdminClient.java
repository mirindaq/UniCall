package iuh.fit.saga_orchestrator_service.clients;

import iuh.fit.common_service.exceptions.ConflictException;
import iuh.fit.unicall.grpc.saga.signup.v1.SignupSagaRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class KeycloakAdminClient {
    private final WebClient keycloakWebClient;

    @Value("${app.security.keycloak.realm}")
    private String realm;

    @Value("${app.security.keycloak.admin-client-id}")
    private String adminClientId;

    @Value("${app.security.keycloak.admin-client-secret}")
    private String adminClientSecret;

    public String createUser(SignupSagaRequest request) {
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
        String token = getAdminToken();
        keycloakWebClient.delete()
                .uri("/admin/realms/{realm}/users/{id}", realm, userId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .toBodilessEntity()
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
                .bodyToMono(Map.class)
                .cast(Map.class)
                .block();

        if (tokenMap == null || tokenMap.get("access_token") == null) {
            throw new IllegalStateException("Unable to obtain admin token from Keycloak");
        }
        return tokenMap.get("access_token").toString();
    }

    private Map<String, Object> buildUser(SignupSagaRequest request) {
        Map<String, Object> user = new HashMap<>();
        user.put("username", request.getPhoneNumber());
        user.put("firstName", request.getFirstName());
        user.put("lastName", request.getLastName());
        user.put("enabled", true);
        user.put("emailVerified", false);
        user.put("attributes", Map.of(
                "phoneNumber", List.of(request.getPhoneNumber()),
                "gender", List.of(request.getGender()),
                "dateOfBirth", List.of(request.getDateOfBirth())
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
}
