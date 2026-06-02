package iuh.fit.identity_service.services.impl;

import iuh.fit.identity_service.dtos.response.auth.SecurityRealtimeEventResponse;
import iuh.fit.identity_service.services.LoginSessionEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoginSessionEventPublisherImpl implements LoginSessionEventPublisher {
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publishLoggedInElsewhere(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            return;
        }
        messagingTemplate.convertAndSendToUser(
                identityUserId,
                "/queue/security-events",
                SecurityRealtimeEventResponse.loggedInElsewhere()
        );
    }
}
