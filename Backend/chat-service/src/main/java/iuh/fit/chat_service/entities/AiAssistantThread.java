package iuh.fit.chat_service.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "ai_assistant_threads")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiAssistantThread {
    @Id
    private String id;

    @Indexed
    private String ownerUserId;

    private String title;
    private String pendingActionType;
    private String pendingActionPayloadJson;
    private LocalDateTime pendingActionCreatedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
