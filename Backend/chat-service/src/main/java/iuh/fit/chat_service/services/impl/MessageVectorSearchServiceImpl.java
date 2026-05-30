package iuh.fit.chat_service.services.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.chat_service.config.AiAssistantProperties;
import iuh.fit.chat_service.config.VectorSearchProperties;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.services.MessageVectorSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageVectorSearchServiceImpl implements MessageVectorSearchService {
    private final VectorSearchProperties properties;
    private final AiAssistantProperties aiAssistantProperties;
    private final ObjectMapper objectMapper;

    private volatile boolean collectionReady;

    @Override
    public void upsertMessage(Message message) {
        if (!isEnabled()) {
            return;
        }
        if (message == null || !StringUtils.hasText(message.getIdMessage())) {
            return;
        }
        if (message.isRecalled()) {
            deleteMessage(message.getIdMessage());
            return;
        }

        String textForEmbedding = buildIndexableText(message);
        if (textForEmbedding.length() < Math.max(1, properties.getMinContentLength())) {
            return;
        }

        try {
            List<Double> vector = embedText(textForEmbedding);
            if (vector.isEmpty() || !ensureCollection(vector.size())) {
                return;
            }

            String endpoint = qdrantBaseUrl()
                    + "/collections/" + encodedCollectionName()
                    + "/points?wait=false";
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("messageId", message.getIdMessage().trim());
            payload.put("conversationId", safe(message.getIdConversation()));
            payload.put("senderId", safe(message.getIdAccountSent()));
            if (message.getTimeSent() != null) {
                payload.put("timeSent", message.getTimeSent().toString());
            }

            Map<String, Object> point = new LinkedHashMap<>();
            point.put("id", message.getIdMessage().trim());
            point.put("vector", vector);
            point.put("payload", payload);

            Map<String, Object> body = Map.of("points", List.of(point));
            exchangeJson(endpoint, HttpMethod.PUT, body, qdrantHeaders(), qdrantTimeoutMs());
        } catch (Exception ex) {
            log.warn("Upsert vector failed for message {}: {}", safe(message.getIdMessage()), ex.getMessage());
        }
    }

    @Override
    public void deleteMessage(String messageId) {
        if (!isEnabled() || !StringUtils.hasText(messageId)) {
            return;
        }
        try {
            String endpoint = qdrantBaseUrl()
                    + "/collections/" + encodedCollectionName()
                    + "/points/delete?wait=false";
            Map<String, Object> body = Map.of("points", List.of(messageId.trim()));
            exchangeJson(endpoint, HttpMethod.POST, body, qdrantHeaders(), qdrantTimeoutMs());
        } catch (Exception ex) {
            log.warn("Delete vector failed for message {}: {}", messageId, ex.getMessage());
        }
    }

    @Override
    public List<ScoredPoint> search(String conversationId, String query, int limit) {
        if (!isEnabled() || !StringUtils.hasText(conversationId) || !StringUtils.hasText(query)) {
            return List.of();
        }

        int normalizedLimit = limit < 1 ? properties.getDefaultLimit() : limit;
        normalizedLimit = Math.min(Math.max(normalizedLimit, 1), Math.max(1, properties.getMaxLimit()));

        try {
            List<Double> vector = embedText(query.trim());
            if (vector.isEmpty() || !ensureCollection(vector.size())) {
                return List.of();
            }

            String endpoint = qdrantBaseUrl()
                    + "/collections/" + encodedCollectionName()
                    + "/points/search";

            Map<String, Object> filter = Map.of(
                    "must",
                    List.of(Map.of("key", "conversationId", "match", Map.of("value", conversationId.trim())))
            );
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("vector", vector);
            body.put("limit", normalizedLimit);
            body.put("with_payload", false);
            body.put("with_vector", false);
            body.put("filter", filter);

            JsonNode response = exchangeJson(endpoint, HttpMethod.POST, body, qdrantHeaders(), qdrantTimeoutMs());
            JsonNode result = response.path("result");
            if (!result.isArray()) {
                return List.of();
            }

            List<ScoredPoint> points = new ArrayList<>();
            for (JsonNode item : result) {
                String messageId = parsePointId(item.path("id"));
                if (!StringUtils.hasText(messageId)) {
                    continue;
                }
                double score = item.path("score").asDouble(0d);
                points.add(new ScoredPoint(messageId, score));
            }
            return points;
        } catch (RestClientResponseException ex) {
            log.warn(
                    "Vector search request failed: status={}, body={}",
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString()
            );
            return List.of();
        } catch (Exception ex) {
            log.warn("Vector search failed: {}", ex.getMessage());
            return List.of();
        }
    }

    @Override
    public boolean isEnabled() {
        if (!properties.isEnabled()) {
            return false;
        }
        if (!StringUtils.hasText(aiAssistantProperties.getApiKey())) {
            return false;
        }
        return StringUtils.hasText(properties.getQdrant().getBaseUrl())
                && StringUtils.hasText(properties.getQdrant().getCollection())
                && StringUtils.hasText(properties.getEmbeddingModel());
    }

    private List<Double> embedText(String text) throws Exception {
        String endpoint = aiAssistantProperties.getBaseUrl().trim()
                + "/models/" + properties.getEmbeddingModel().trim()
                + ":embedContent?key=" + aiAssistantProperties.getApiKey().trim();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", "models/" + properties.getEmbeddingModel().trim());
        body.put("content", Map.of("parts", List.of(Map.of("text", text))));

        JsonNode response = exchangeJson(
                endpoint,
                HttpMethod.POST,
                body,
                jsonHeaders(),
                Math.max(aiAssistantProperties.getReadTimeoutMs(), qdrantTimeoutMs())
        );

        JsonNode values = response.path("embedding").path("values");
        if (!values.isArray()) {
            JsonNode fallbackValues = response.path("embeddings");
            if (fallbackValues.isArray() && !fallbackValues.isEmpty()) {
                values = fallbackValues.get(0).path("values");
            }
        }
        if (!values.isArray()) {
            return List.of();
        }

        List<Double> vector = new ArrayList<>(values.size());
        for (JsonNode value : values) {
            vector.add(value.asDouble());
        }
        return vector;
    }

    private String buildIndexableText(Message message) {
        String normalizedContent = safe(message.getContent());
        if (!StringUtils.hasText(normalizedContent)) {
            return "";
        }
        if (normalizedContent.length() > 3000) {
            return normalizedContent.substring(0, 3000);
        }
        return normalizedContent;
    }

    private boolean ensureCollection(int embeddingVectorSize) {
        if (collectionReady) {
            return true;
        }
        synchronized (this) {
            if (collectionReady) {
                return true;
            }
            if (collectionExists()) {
                collectionReady = true;
                return true;
            }
            if (!properties.getQdrant().isAutoCreateCollection()) {
                return false;
            }

            int configuredSize = properties.getQdrant().getVectorSize();
            int vectorSize = configuredSize > 0 ? configuredSize : embeddingVectorSize;
            if (vectorSize <= 0) {
                return false;
            }

            String endpoint = qdrantBaseUrl() + "/collections/" + encodedCollectionName();
            Map<String, Object> body = Map.of(
                    "vectors",
                    Map.of(
                            "size", vectorSize,
                            "distance", firstNonBlank(properties.getQdrant().getDistance(), "Cosine")
                    )
            );
            try {
                exchangeJson(endpoint, HttpMethod.PUT, body, qdrantHeaders(), qdrantTimeoutMs());
                collectionReady = true;
                return true;
            } catch (Exception ex) {
                log.warn("Create vector collection failed: {}", ex.getMessage());
                return false;
            }
        }
    }

    private boolean collectionExists() {
        String endpoint = qdrantBaseUrl() + "/collections/" + encodedCollectionName();
        try {
            exchangeJson(endpoint, HttpMethod.GET, null, qdrantHeaders(), qdrantTimeoutMs());
            return true;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) {
                return false;
            }
            throw ex;
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    private JsonNode exchangeJson(
            String endpoint,
            HttpMethod method,
            Object body,
            HttpHeaders headers,
            int timeoutMs
    ) throws Exception {
        HttpEntity<?> request = body == null ? new HttpEntity<>(headers) : new HttpEntity<>(body, headers);
        RestTemplate restTemplate = buildRestTemplate(timeoutMs);
        ResponseEntity<String> response = restTemplate.exchange(endpoint, method, request, String.class);
        String rawBody = response.getBody();
        if (!StringUtils.hasText(rawBody)) {
            return objectMapper.createObjectNode();
        }
        return objectMapper.readTree(rawBody);
    }

    private RestTemplate buildRestTemplate(int timeoutMs) {
        int normalizedTimeout = Math.max(1000, timeoutMs);
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(normalizedTimeout);
        requestFactory.setReadTimeout(normalizedTimeout);
        return new RestTemplate(requestFactory);
    }

    private HttpHeaders jsonHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private HttpHeaders qdrantHeaders() {
        HttpHeaders headers = jsonHeaders();
        if (StringUtils.hasText(properties.getQdrant().getApiKey())) {
            headers.set("api-key", properties.getQdrant().getApiKey().trim());
        }
        return headers;
    }

    private String qdrantBaseUrl() {
        String base = firstNonBlank(properties.getQdrant().getBaseUrl(), "http://localhost:6333");
        if (base.endsWith("/")) {
            return base.substring(0, base.length() - 1);
        }
        return base;
    }

    private String encodedCollectionName() {
        return URLEncoder.encode(properties.getQdrant().getCollection().trim(), StandardCharsets.UTF_8);
    }

    private int qdrantTimeoutMs() {
        return Math.max(1000, properties.getQdrant().getTimeoutMs());
    }

    private static String parsePointId(JsonNode idNode) {
        if (idNode == null || idNode.isNull()) {
            return null;
        }
        if (idNode.isTextual() || idNode.isIntegralNumber()) {
            return idNode.asText();
        }
        if (idNode.isObject()) {
            if (idNode.has("uuid")) {
                String uuid = idNode.path("uuid").asText("");
                return uuid.isBlank() ? null : uuid;
            }
            if (idNode.has("num")) {
                return idNode.path("num").asText("");
            }
        }
        return null;
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private static String firstNonBlank(String value, String fallback) {
        if (StringUtils.hasText(value)) {
            return value.trim();
        }
        return fallback;
    }
}
