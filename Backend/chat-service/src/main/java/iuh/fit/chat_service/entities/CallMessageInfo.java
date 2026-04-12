package iuh.fit.chat_service.entities;

import iuh.fit.chat_service.enums.CallOutcome;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallMessageInfo {
    private String callId;
    private boolean audioOnly;
    private String callerUserId;
    private String calleeUserId;
    private String endedByUserId;
    private Long durationSeconds;
    private CallOutcome outcome;
}
