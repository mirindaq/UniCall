package iuh.fit.chat_service.entities;

import iuh.fit.chat_service.enums.AssistantMessageRole;
import iuh.fit.chat_service.enums.ChatAssistantIntent;
import iuh.fit.chat_service.enums.ChatAssistantTool;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "ai_assistant_messages")
@CompoundIndex(name = "thread_time_idx", def = "{'threadId': 1, 'createdAt': -1}")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiAssistantMessage {
    @Id
    private String id;

    @Indexed
    private String threadId;

    @Indexed
    private String ownerUserId;

    private AssistantMessageRole role;
    private String content;

    private ChatAssistantIntent intent;
    private List<ChatAssistantTool> toolsUsed;
    private String toolDataJson;

    private LocalDateTime createdAt;
}
