package iuh.fit.identity_service.clients;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class UserDeletionStateClient {
    private static final String USER_ID_HEADER = "X-User-Id";

    @Value("${external-services.user-service.base-url:http://localhost:8081/user-service}")
    private String userServiceBaseUrl;

    public void cancelDeletionRequest(String identityUserId) {
        String url = userServiceBaseUrl + "/api/v1/users/me/deletion-request/cancel";

        try {
            RestClient.create()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(USER_ID_HEADER, identityUserId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw new RuntimeException("Unable to reset account deletion status", ex);
        }
    }
}
