package iuh.fit.chat_service.entities;

import iuh.fit.chat_service.enums.CallOutcome;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "call_sessions")
@CompoundIndex(name = "conversation_time", def = "{'conversationId': 1, 'initiatedAt': -1}")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallSession {
    @Id
    private String callId;
    private String conversationId;
    private String callerUserId;
    private String calleeUserId;
    private boolean audioOnly;
    private LocalDateTime initiatedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime endedAt;
    private String endedByUserId;
    private Long durationSeconds;
    private CallOutcome outcome;
    private String summaryMessageId;
}
