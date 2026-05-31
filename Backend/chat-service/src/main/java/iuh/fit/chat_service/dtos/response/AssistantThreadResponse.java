package iuh.fit.chat_service.dtos.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AssistantThreadResponse {
    private String threadId;
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
