package iuh.fit.chat_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "app.ai-assistant")
public class AiAssistantProperties {
    private boolean enabled = true;
    private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private String textModel = "gemini-2.0-flash";
    private String imageModel = "gemini-2.0-flash-preview-image-generation";
    private String apiKey = "";
    private String textSystemPrompt = "Bạn là UniCall AI, trả lời ngắn gọn, hữu ích, lịch sự bằng tiếng Việt.";
    private String imageSystemPrompt = "Bạn là UniCallImage, tạo mô tả ảnh ngắn gọn bằng tiếng Việt.";
    private int connectTimeoutMs = 3000;
    private int readTimeoutMs = 30000;
}
