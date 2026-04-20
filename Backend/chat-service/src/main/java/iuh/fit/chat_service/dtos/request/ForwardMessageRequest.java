package iuh.fit.chat_service.dtos.request;

import lombok.Data;

import java.util.List;

@Data
public class ForwardMessageRequest {
    private List<String> targetConversationIds;
    private List<String> targetUserIds;
    private String note;
}
