package iuh.fit.chat_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "app.ai-assistant.vector-search")
public class VectorSearchProperties {
    private boolean enabled = false;
    private String embeddingModel = "gemini-embedding-001";
    private int defaultLimit = 12;
    private int maxLimit = 50;
    private int minContentLength = 3;
    private Qdrant qdrant = new Qdrant();

    @Data
    public static class Qdrant {
        private String baseUrl = "http://localhost:6333";
        private String collection = "unicall_chat_messages";
        private String apiKey = "";
        private int timeoutMs = 5000;
        private boolean autoCreateCollection = true;
        private int vectorSize = 0;
        private String distance = "Cosine";
    }
}
