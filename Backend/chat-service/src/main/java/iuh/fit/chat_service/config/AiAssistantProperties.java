package iuh.fit.chat_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "app.ai-assistant")
public class AiAssistantProperties {
    private boolean enabled = true;
    private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private String textModel = "gemini-2.5-flash";
    private String imageModel = "gemini-2.5-flash-image";
    private String imageProvider = "gemini";
    private String apiKey = "";
    private String stabilityBaseUrl = "https://api.stability.ai";
    private String stabilityApiKey = "";
    private String stabilityImageModel = "stable-image-core";
    private String stabilityOutputFormat = "png";
    private String textSystemPrompt = "Ban la UniCall AI, tra loi huu ich, lich su bang tieng Viet.";
    private String imageSystemPrompt = "Ban la UniCallImage, tao mo ta anh ngan gon bang tieng Viet.";
    private int connectTimeoutMs = 3000;
    private int readTimeoutMs = 30000;
}
