package iuh.fit.chat_service.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "conversation_blocks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConversationBlock {
    @Id
    private String id;

    @Indexed
    private String conversationId;

    @Indexed
    private String blockerId;

    @Indexed
    private String blockedUserId;

    private LocalDateTime blockedAt;
}

