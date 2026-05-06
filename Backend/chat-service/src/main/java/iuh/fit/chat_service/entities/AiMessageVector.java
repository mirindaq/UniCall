package iuh.fit.chat_service.entities;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "ai_message_vectors")
@CompoundIndex(name = "conversation_model_time", def = "{'idConversation': 1, 'embeddingModel': 1, 'timeSent': -1}")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiMessageVector {
    @Id
    private String id;

    @Indexed
    private String idMessage;
    private String idConversation;
    private String idAccountSent;
    private LocalDateTime timeSent;

    private String embeddingModel;
    private String normalizedText;
    private String contentPreview;
    private List<Double> embeddingValues;
    private LocalDateTime updatedAt;
}

