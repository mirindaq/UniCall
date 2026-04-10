package iuh.fit.chat_service.dtos.request;

import iuh.fit.chat_service.enums.CallSignalType;
import lombok.Data;

@Data
public class ConversationCallSignalRequest {
    private String conversationId;
    private String callId;
    private CallSignalType type;
    private Boolean audioOnly = Boolean.TRUE;
    private String sdp;
    private String candidate;
    private String sdpMid;
    private Integer sdpMLineIndex;
}
