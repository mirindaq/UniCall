package iuh.fit.friend_service.clients;

import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class UserPrivacyClient {
    @Value("${external-services.user-service.base-url:http://localhost:8081/user-service}")
    private String userServiceBaseUrl;

    public boolean allowFriendInvites(String identityUserId) {
        String url = userServiceBaseUrl + "/api/v1/users/identity/" + identityUserId + "/privacy/friend-invites";
        PrivacyEnvelope response = RestClient.create()
                .get()
                .uri(url)
                .retrieve()
                .body(PrivacyEnvelope.class);
        if (response == null || response.getData() == null) {
            return true;
        }
        return Boolean.TRUE.equals(response.getData().getAllowFriendInvites());
    }

    @Getter
    @Setter
    private static class PrivacyEnvelope {
        private PrivacyData data;
    }

    @Getter
    @Setter
    private static class PrivacyData {
        private Boolean allowFriendInvites;
    }
}
