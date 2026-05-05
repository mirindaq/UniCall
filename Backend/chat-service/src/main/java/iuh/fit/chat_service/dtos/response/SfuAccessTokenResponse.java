package iuh.fit.chat_service.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SfuAccessTokenResponse {
    private String callId;
    private String roomName;
    private String url;
    private String token;
    private LocalDateTime expiresAt;
}

