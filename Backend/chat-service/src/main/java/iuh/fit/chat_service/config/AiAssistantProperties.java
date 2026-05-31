package iuh.fit.chat_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "app.ai-assistant")
public class AiAssistantProperties {
    private boolean enabled = true;
    private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private String textModel = "gemini-2.5-pro";
    private String imageModel = "gemini-2.5-flash-image";
    private String apiKey = "";
    private String textSystemPrompt = "Bạn là UniCall AI, trả lời ngắn gọn, hữu ích, lịch sự bằng tiếng Việt.";
    private String imageSystemPrompt = "Bạn là UniCallImage, tạo mô tả ảnh ngắn gọn bằng tiếng Việt.";
    private int connectTimeoutMs = 3000;
    private int readTimeoutMs = 30000;
    private VectorSearchProperties vectorSearch = new VectorSearchProperties();
    private TaskToolsProperties taskTools = new TaskToolsProperties();

    @Data
    public static class VectorSearchProperties {
        private boolean enabled = false;
        private String embeddingModel = "text-multilingual-embedding-002";
        private int defaultLimit = 12;
        private int maxLimit = 50;
        private int minContentLength = 3;
        private RabbitMqProperties rabbitmq = new RabbitMqProperties();
        private QdrantProperties qdrant = new QdrantProperties();
    }

    @Data
    public static class RabbitMqProperties {
        private String exchange = "unicall.chat.ai.vector.exchange";
        private String queue = "unicall.chat.ai.vector.queue";
        private String routingKey = "chat.ai.vector.index";
    }

    @Data
    public static class QdrantProperties {
        private String baseUrl = "http://localhost:6333";
        private String collection = "unicall_chat_messages";
        private String apiKey = "";
        private int timeoutMs = 5000;
        private boolean autoCreateCollection = true;
        private int vectorSize = 0;
        private String distance = "Cosine";
    }

    @Data
    public static class TaskToolsProperties {
        private String baseUrl = "http://localhost:8090/api/v1/tasks";
        private int connectTimeoutMs = 3000;
        private int readTimeoutMs = 8000;
        private int defaultLimit = 20;
        private int maxLimit = 100;
        private int defaultDueSoonDays = 3;
    }
}
