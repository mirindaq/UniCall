package iuh.fit.chat_service.dtos.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ForwardMessageResponse {
    private int forwardedConversationCount;
    private List<String> targetConversationIds;
}
