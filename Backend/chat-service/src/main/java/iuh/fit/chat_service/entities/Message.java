package iuh.fit.chat_service.entities;

import iuh.fit.chat_service.enums.MessageEnum;
import iuh.fit.chat_service.enums.MessageType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Document(collection = "messages")
@CompoundIndex(name = "conversation_time", def = "{'idConversation': 1, 'timeSent': -1}")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    @Id
    private String idMessage;
    private String idConversation;
    private String idAccountSent;
    private MessageEnum status;
    private String content;
    private MessageType type;
    private LocalDateTime timeSent;
    private LocalDateTime timeUpdate;
    private List<Attachment> attachments;
    private Map<String, String> reactions;
    private String replyToMessageId;
    private boolean isEdited;
    private List<String> editHistory;
    private boolean recalled;
    private List<String> hiddenForAccountIds;
}