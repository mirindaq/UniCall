package iuh.fit.identity_service.dtos.response.auth;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class SecurityRealtimeEventResponse {
    private String eventType;
    private String message;
    private Instant sentAt;

    public static SecurityRealtimeEventResponse loggedInElsewhere() {
        return SecurityRealtimeEventResponse.builder()
                .eventType("LOGGED_IN_ELSEWHERE")
                .message("Tài khoản đã được đăng nhập ở nơi khác.")
                .sentAt(Instant.now())
                .build();
    }
}
