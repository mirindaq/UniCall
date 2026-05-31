package iuh.fit.chat_service.services.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.chat_service.config.AiAssistantProperties;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.MessageType;
import iuh.fit.chat_service.services.ConversationMessageVectorService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationMessageVectorServiceImpl implements ConversationMessageVectorService {

    private final AiAssistantProperties properties;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<EmbeddingModel> embeddingModelProvider;
    private final AtomicBoolean collectionEnsured = new AtomicBoolean(false);

    private volatile RestTemplate qdrantRestTemplate;

    @PostConstruct
    public void logVectorRuntimeConfig() {
        AiAssistantProperties.VectorSearchProperties vectorSearch = properties.getVectorSearch();
        AiAssistantProperties.QdrantProperties qdrant = vectorSearch == null ? null : vectorSearch.getQdrant();
        String qdrantBaseUrl = qdrant == null ? null : qdrant.getBaseUrl();
        String qdrantCollection = qdrant == null ? null : qdrant.getCollection();

        log.info(
                "Vector config: enabled={}, embeddingModel={}, qdrantBaseUrl={}, qdrantCollection={}, autoCreateCollection={}, timeoutMs={}",
                vectorSearch != null && vectorSearch.isEnabled(),
                vectorSearch == null ? null : vectorSearch.getEmbeddingModel(),
                qdrantBaseUrl,
                qdrantCollection,
                qdrant != null && qdrant.isAutoCreateCollection(),
                qdrant == null ? null : qdrant.getTimeoutMs()
        );

        if (vectorSearch != null && vectorSearch.isEnabled() && embeddingModelProvider.getIfAvailable() == null) {
            log.warn("Vector is enabled but EmbeddingModel bean is not available. Check Spring AI embedding dependency/config.");
        }
    }

    @Override
    public void upsertMessage(Message message, Conversation conversation) {
        if (!isFeatureEnabled() || message == null || !StringUtils.hasText(message.getIdMessage())) {
            return;
        }

        if (!isEmbeddableMessage(message)) {
            deleteMessage(message.getIdMessage());
            return;
        }

        String normalizedContent = normalizeContent(message.getContent());
        if (!StringUtils.hasText(normalizedContent)) {
            return;
        }

        float[] embedding;
        try {
            embedding = requireEmbeddingModel().embed(normalizedContent);
        } catch (Exception ex) {
            log.warn("Vector embedding failed for messageId={}: {}", message.getIdMessage(), ex.getMessage());
            return;
        }
        if (embedding == null || embedding.length == 0) {
            return;
        }

        ensureCollection(embedding.length);
        List<Double> vector = toDoubleVector(embedding);
        if (vector.isEmpty()) {
            return;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messageId", message.getIdMessage());
        payload.put("conversationId", message.getIdConversation());
        payload.put("senderId", message.getIdAccountSent());
        payload.put("text", normalizedContent);
        payload.put("timeSent", message.getTimeSent() == null ? null : message.getTimeSent().toString());
        payload.put("messageType", message.getType() == null ? null : message.getType().name());
        payload.put("recalled", message.isRecalled());
        payload.put("hiddenForAccountIds", message.getHiddenForAccountIds() == null ? List.of() : message.getHiddenForAccountIds());
        payload.put("participantIds", resolveParticipantIds(conversation));

        Map<String, Object> point = new LinkedHashMap<>();
        point.put("id", message.getIdMessage());
        point.put("vector", vector);
        point.put("payload", payload);

        Map<String, Object> requestBody = Map.of("points", List.of(point));
        callQdrant(
                HttpMethod.PUT,
                collectionPath() + "/points?wait=false",
                requestBody
        );
        log.info(
                "Qdrant upsert ok: messageId={}, conversationId={}, vectorSize={}, collection={}",
                message.getIdMessage(),
                message.getIdConversation(),
                vector.size(),
                properties.getVectorSearch().getQdrant().getCollection()
        );
    }

    @Override
    public void deleteMessage(String messageId) {
        if (!isFeatureEnabled() || !StringUtils.hasText(messageId)) {
            return;
        }
        Map<String, Object> requestBody = Map.of("points", List.of(messageId.trim()));
        callQdrant(HttpMethod.POST, collectionPath() + "/points/delete?wait=false", requestBody);
        log.info(
                "Qdrant delete ok: messageId={}, collection={}",
                messageId.trim(),
                properties.getVectorSearch().getQdrant().getCollection()
        );
    }

    @Override
    public List<MemoryHit> searchConversation(String conversationId, String requesterId, String query, Integer limit) {
        if (!isFeatureEnabled() || !StringUtils.hasText(conversationId) || !StringUtils.hasText(query)) {
            return List.of();
        }

        float[] embedding;
        try {
            embedding = requireEmbeddingModel().embed(query.trim());
        } catch (Exception ex) {
            log.warn("Vector query embedding failed: {}", ex.getMessage());
            return List.of();
        }
        if (embedding == null || embedding.length == 0) {
            return List.of();
        }

        ensureCollection(embedding.length);

        int resolvedLimit = resolveLimit(limit);
        List<Map<String, Object>> mustConditions = new ArrayList<>();
        mustConditions.add(matchCondition("conversationId", conversationId.trim()));
        mustConditions.add(matchCondition("recalled", false));

        Map<String, Object> filter = new LinkedHashMap<>();
        filter.put("must", mustConditions);
        if (StringUtils.hasText(requesterId)) {
            filter.put("must_not", List.of(matchCondition("hiddenForAccountIds", requesterId.trim())));
        }

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("query", toDoubleVector(embedding));
        requestBody.put("limit", resolvedLimit);
        requestBody.put("with_payload", true);
        requestBody.put("filter", filter);

        JsonNode response = callQdrant(HttpMethod.POST, collectionPath() + "/points/query", requestBody);
        if (response == null) {
            return List.of();
        }

        JsonNode points = response.path("result").path("points");
        if (!points.isArray() || points.isEmpty()) {
            return List.of();
        }

        List<MemoryHit> hits = new ArrayList<>();
        for (JsonNode point : points) {
            JsonNode payload = point.path("payload");
            String messageId = textValue(payload, "messageId");
            String hitConversationId = textValue(payload, "conversationId");
            String senderId = textValue(payload, "senderId");
            String text = textValue(payload, "text");
            String timeSentRaw = textValue(payload, "timeSent");
            double score = point.path("score").asDouble(0D);
            LocalDateTime timeSent = parseLocalDateTime(timeSentRaw);
            hits.add(new MemoryHit(messageId, hitConversationId, senderId, text, timeSent, score));
        }
        return hits;
    }

    private boolean isFeatureEnabled() {
        return properties.getVectorSearch() != null && properties.getVectorSearch().isEnabled();
    }

    private boolean isEmbeddableMessage(Message message) {
        MessageType type = message.getType() == null ? MessageType.TEXT : message.getType();
        if (message.isRecalled()) {
            return false;
        }
        if (type != MessageType.TEXT && type != MessageType.MIX) {
            return false;
        }
        String normalized = normalizeContent(message.getContent());
        return StringUtils.hasText(normalized);
    }

    private String normalizeContent(String content) {
        if (!StringUtils.hasText(content)) {
            return null;
        }
        String normalized = content.trim();
        int minLength = Math.max(1, properties.getVectorSearch().getMinContentLength());
        return normalized.length() >= minLength ? normalized : null;
    }

    private EmbeddingModel requireEmbeddingModel() {
        EmbeddingModel model = embeddingModelProvider.getIfAvailable();
        if (model == null) {
            throw new IllegalStateException("EmbeddingModel bean is not available");
        }
        return model;
    }

    private RestTemplate qdrantRestTemplate() {
        RestTemplate cached = qdrantRestTemplate;
        if (cached != null) {
            return cached;
        }

        synchronized (this) {
            if (qdrantRestTemplate != null) {
                return qdrantRestTemplate;
            }
            int timeoutMs = Math.max(1000, properties.getVectorSearch().getQdrant().getTimeoutMs());
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(timeoutMs);
            requestFactory.setReadTimeout(timeoutMs);
            qdrantRestTemplate = new RestTemplate(requestFactory);
            return qdrantRestTemplate;
        }
    }

    private void ensureCollection(int detectedVectorSize) {
        AiAssistantProperties.QdrantProperties qdrant = properties.getVectorSearch().getQdrant();
        if (!qdrant.isAutoCreateCollection() || collectionEnsured.get()) {
            return;
        }

        synchronized (collectionEnsured) {
            if (collectionEnsured.get()) {
                return;
            }

            String path = collectionPath();
            try {
                callQdrant(HttpMethod.GET, path, null);
                collectionEnsured.set(true);
                return;
            } catch (HttpClientErrorException.NotFound ignored) {
                // Collection chưa tồn tại, tạo mới phía dưới.
            } catch (Exception ex) {
                log.warn("Cannot verify qdrant collection {}: {}", qdrant.getCollection(), ex.getMessage());
                return;
            }

            int vectorSize = qdrant.getVectorSize() > 0 ? qdrant.getVectorSize() : detectedVectorSize;
            if (vectorSize <= 0) {
                log.warn("Skip qdrant collection creation because vector size is invalid");
                return;
            }

            Map<String, Object> requestBody = Map.of(
                    "vectors",
                    Map.of(
                            "size", vectorSize,
                            "distance", normalizeDistance(qdrant.getDistance())
                    )
            );
            try {
                callQdrant(HttpMethod.PUT, path, requestBody);
                collectionEnsured.set(true);
                log.info("Created qdrant collection {} with vector size {}", qdrant.getCollection(), vectorSize);
            } catch (Exception ex) {
                log.warn("Cannot create qdrant collection {}: {}", qdrant.getCollection(), ex.getMessage());
            }
        }
    }

    private JsonNode callQdrant(HttpMethod method, String path, Map<String, Object> body) {
        String baseUrl = properties.getVectorSearch().getQdrant().getBaseUrl();
        if (!StringUtils.hasText(baseUrl)) {
            throw new IllegalStateException("Qdrant base url is not configured");
        }

        String normalizedBaseUrl = baseUrl.trim().replaceAll("/+$", "");
        String url = normalizedBaseUrl + path;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String apiKey = properties.getVectorSearch().getQdrant().getApiKey();
        if (StringUtils.hasText(apiKey)) {
            headers.set("api-key", apiKey.trim());
        }

        HttpEntity<?> request = body == null ? new HttpEntity<>(headers) : new HttpEntity<>(body, headers);
        try {
            ResponseEntity<String> response = qdrantRestTemplate().exchange(url, method, request, String.class);
            String rawBody = response.getBody();
            if (!StringUtils.hasText(rawBody)) {
                return null;
            }
            return objectMapper.readTree(rawBody);
        } catch (HttpClientErrorException.NotFound notFound) {
            throw notFound;
        } catch (RestClientException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Qdrant call failed", ex);
        }
    }

    private String collectionPath() {
        String collection = properties.getVectorSearch().getQdrant().getCollection();
        if (!StringUtils.hasText(collection)) {
            throw new IllegalStateException("Qdrant collection is not configured");
        }
        return "/collections/" + UriUtils.encodePathSegment(collection.trim(), StandardCharsets.UTF_8);
    }

    private int resolveLimit(Integer limit) {
        int maxLimit = Math.max(1, properties.getVectorSearch().getMaxLimit());
        int defaultLimit = Math.max(1, properties.getVectorSearch().getDefaultLimit());
        int resolved = limit == null ? defaultLimit : Math.max(1, limit);
        return Math.min(resolved, maxLimit);
    }

    private static Map<String, Object> matchCondition(String key, Object value) {
        return Map.of(
                "key", key,
                "match", Map.of("value", value)
        );
    }

    private static List<Double> toDoubleVector(float[] vector) {
        if (vector == null || vector.length == 0) {
            return List.of();
        }
        List<Double> list = new ArrayList<>(vector.length);
        for (float value : vector) {
            list.add((double) value);
        }
        return list;
    }

    private static List<String> resolveParticipantIds(Conversation conversation) {
        if (conversation == null || conversation.getParticipantInfos() == null) {
            return List.of();
        }
        Set<String> ids = new LinkedHashSet<>();
        for (ParticipantInfo participant : conversation.getParticipantInfos()) {
            if (participant == null || !StringUtils.hasText(participant.getIdAccount())) {
                continue;
            }
            ids.add(participant.getIdAccount().trim());
        }
        return new ArrayList<>(ids);
    }

    private static String textValue(JsonNode node, String fieldName) {
        if (node == null || !node.has(fieldName) || node.get(fieldName).isNull()) {
            return null;
        }
        String value = node.get(fieldName).asText(null);
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static LocalDateTime parseLocalDateTime(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return LocalDateTime.parse(value.trim());
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String normalizeDistance(String value) {
        if (!StringUtils.hasText(value)) {
            return "Cosine";
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "DOT" -> "Dot";
            case "EUCLID" -> "Euclid";
            case "MANHATTAN" -> "Manhattan";
            default -> "Cosine";
        };
    }
}
