package iuh.fit.chat_service.entities;

import iuh.fit.chat_service.enums.AiThreadRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "ai_assistant_threads")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiAssistantThread {
    @Id
    private String idThread;
    private String ownerIdentityUserId;
    private String title;
    private String defaultConversationId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<Turn> turns;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Turn {
        private String idTurn;
        private AiThreadRole role;
        private String content;
        private LocalDateTime createdAt;
        private List<Citation> citations;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Citation {
        private String messageId;
        private String conversationId;
        private String senderIdentityUserId;
        private LocalDateTime timeSent;
        private String snippet;
        private double score;
    }
}
