package iuh.fit.identity_service.services.impl;

import iuh.fit.identity_service.clients.KeycloakIdentityClient;
import iuh.fit.identity_service.clients.SignupSagaGrpcClient;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AuthTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import iuh.fit.identity_service.services.KeycloakAuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class KeycloakAuthServiceImpl implements KeycloakAuthService {
    private final KeycloakIdentityClient keycloakIdentityClient;
    private final SignupSagaGrpcClient signupSagaGrpcClient;

    @Value("${app.security.keycloak.server-url}")
    private String keycloakServerUrl;

    @Value("${app.security.keycloak.realm}")
    private String realm;

    @Value("${app.security.keycloak.client-id}")
    private String clientId;

    @Value("${app.security.keycloak.redirect-uri}")
    private String redirectUri;

    @Value("${app.security.keycloak.scope:openid profile email}")
    private String scope;

    @Override
    public RegisterResponse register(RegisterRequest request) {
        return signupSagaGrpcClient.register(request);
    }

    @Override
    public String buildAuthorizationUrl(String state, String codeChallenge) {
        return UriComponentsBuilder.fromUriString(keycloakServerUrl)
                .path("/realms/{realm}/protocol/openid-connect/auth")
                .queryParam("client_id", clientId)
                .queryParam("response_type", "code")
                .queryParam("redirect_uri", redirectUri)
                .queryParam("scope", scope)
                .queryParam("state", state)
                .queryParam("code_challenge", codeChallenge)
                .queryParam("code_challenge_method", "S256")
                .buildAndExpand(realm)
                .encode()
                .toUriString();
    }

    @Override
    public AuthTokenResponse exchangeAuthorizationCode(String code, String codeVerifier) {
        return keycloakIdentityClient.exchangeAuthorizationCode(code, codeVerifier);
    }

    @Override
    public AuthTokenResponse refreshToken(String refreshToken) {
        return keycloakIdentityClient.refreshToken(refreshToken);
    }

    @Override
    public void revokeRefreshToken(String refreshToken) {
        keycloakIdentityClient.revokeRefreshToken(refreshToken);
    }
}
