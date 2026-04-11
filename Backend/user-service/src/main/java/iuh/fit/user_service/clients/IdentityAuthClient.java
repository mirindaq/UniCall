package iuh.fit.user_service.clients;

import iuh.fit.common_service.exceptions.InvalidParamException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class IdentityAuthClient {
    @Value("${external-services.identity-service.base-url:http://localhost:8082/identity-service}")
    private String identityServiceBaseUrl;

    public void verifyPassword(String identityUserId, String phoneNumber, String password) {
        String url = identityServiceBaseUrl + "/api/v1/auth/verify-password";

        try {
            RestClient.create()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new VerifyPasswordPayload(identityUserId, phoneNumber, password))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            int status = ex.getStatusCode().value();
            if (status == 401) {
                throw new InvalidParamException("Password is incorrect");
            }
            if (status >= 400 && status < 500) {
                throw new InvalidParamException("Unable to verify password");
            }
            throw new RuntimeException("Identity service is unavailable", ex);
        }
    }

    private record VerifyPasswordPayload(
            String identityUserId,
            String phoneNumber,
            String password
    ) {
    }
}
