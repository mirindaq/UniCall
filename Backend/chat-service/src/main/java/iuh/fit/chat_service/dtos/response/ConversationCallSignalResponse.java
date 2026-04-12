package iuh.fit.chat_service.dtos.response;

import iuh.fit.chat_service.enums.CallSignalType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationCallSignalResponse {
    private String conversationId;
    private String callId;
    private CallSignalType type;
    private String fromUserId;
    private String toUserId;
    private boolean audioOnly;
    private String sdp;
    private String candidate;
    private String sdpMid;
    private Integer sdpMLineIndex;
    private LocalDateTime sentAt;
}
