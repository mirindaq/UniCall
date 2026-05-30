package iuh.fit.chat_service.dtos.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SemanticSearchMessageResponse {
    private double score;
    private MessageResponse message;
}
