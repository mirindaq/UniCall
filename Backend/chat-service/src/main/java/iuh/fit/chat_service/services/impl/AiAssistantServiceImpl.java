package iuh.fit.chat_service.services.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.chat_service.config.AiAssistantProperties;
import iuh.fit.chat_service.services.AiAssistantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiAssistantServiceImpl implements AiAssistantService {
    private final AiAssistantProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    public Optional<AiAssistantReply> buildReply(String conversationId, String requesterId, String content) {
        MentionCommand command = parseMentionCommand(content);
        if (command == null) {
            return Optional.empty();
        }

        boolean enabled = properties.isEnabled();
        boolean hasApiKey = StringUtils.hasText(properties.getApiKey());
        if (!enabled || !hasApiKey) {
            return Optional.of(disabledReply(command, enabled, hasApiKey));
        }

        return switch (command.type) {
            case CHAT -> Optional.of(buildChatReply(conversationId, requesterId, command.prompt));
            case IMAGE -> Optional.of(buildImageReply(conversationId, requesterId, command.prompt));
        };
    }

    private AiAssistantReply buildChatReply(String conversationId, String requesterId, String prompt) {
        try {
            JsonNode response = callGeminiGenerateContent(
                    properties.getTextModel(),
                    buildGeminiContents(requesterId, conversationId, prompt),
                    properties.getTextSystemPrompt(),
                    false
            );
            String answer = extractTextFromGemini(response);
            if (!StringUtils.hasText(answer)) {
                answer = "Mình chưa có câu trả lời phù hợp. Bạn thử hỏi rõ hơn nhé.";
            }
            return new AiAssistantReply(UNICALL_BOT_ID, answer, null);
        } catch (Exception ex) {
            log.warn("Gemini chat failed: {}", ex.getMessage());
            return new AiAssistantReply(
                    UNICALL_BOT_ID,
                    "Xin lỗi, hiện tại UniCall AI đang bận. Bạn thử lại sau nhé.",
                    null
            );
        }
    }

    private AiAssistantReply buildImageReply(String conversationId, String requesterId, String prompt) {
        try {
            JsonNode response = callGeminiGenerateContent(
                    properties.getImageModel(),
                    buildGeminiContents(requesterId, conversationId, prompt),
                    properties.getImageSystemPrompt(),
                    true
            );
            String imageDataUrl = extractImageDataUrlFromGemini(response);
            String answer = firstNonBlank(
                    extractTextFromGemini(response),
                    "Mình đã tạo ảnh theo yêu cầu của bạn."
            );
            if (!StringUtils.hasText(imageDataUrl)) {
                return new AiAssistantReply(
                        UNICALL_IMAGE_BOT_ID,
                        "Mình chưa tạo được ảnh lúc này. Bạn thử lại với prompt khác nhé.",
                        null
                );
            }
            return new AiAssistantReply(UNICALL_IMAGE_BOT_ID, answer, imageDataUrl);
        } catch (RestClientResponseException ex) {
            String userMessage = buildImageErrorMessage(ex);
            log.warn(
                    "Gemini image failed: status={}, body={}",
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString()
            );
            return new AiAssistantReply(UNICALL_IMAGE_BOT_ID, userMessage, null);
        } catch (Exception ex) {
            log.warn("Gemini image failed: {}", ex.getMessage());
            return new AiAssistantReply(
                    UNICALL_IMAGE_BOT_ID,
                    "Xin lỗi, hiện tại UniCallImage đang bận. Bạn thử lại sau nhé.",
                    null
            );
        }
    }

    private JsonNode callGeminiGenerateContent(
            String model,
            List<Map<String, Object>> contents,
            String systemPrompt,
            boolean imageMode
    ) throws Exception {
        if (!StringUtils.hasText(model)) {
            throw new IllegalStateException("Gemini model is not configured");
        }

        String endpoint = properties.getBaseUrl().trim()
                + "/models/" + model.trim()
                + ":generateContent?key=" + properties.getApiKey().trim();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(1000, properties.getConnectTimeoutMs()));
        requestFactory.setReadTimeout(Math.max(1000, properties.getReadTimeoutMs()));
        RestTemplate restTemplate = new RestTemplate(requestFactory);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("contents", contents);
        if (StringUtils.hasText(systemPrompt)) {
            body.put("systemInstruction", Map.of(
                    "parts", List.of(Map.of("text", systemPrompt.trim()))
            ));
        }
        if (imageMode) {
            // IMAGE-only giúp tránh trường hợp model trả text nhưng không có dữ liệu ảnh.
            body.put("generationConfig", Map.of("responseModalities", List.of("IMAGE")));
        }

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.POST, request, String.class);
        String rawBody = response.getBody();
        if (!StringUtils.hasText(rawBody)) {
            return null;
        }
        return objectMapper.readTree(rawBody);
    }

    private static List<Map<String, Object>> buildGeminiContents(
            String requesterId,
            String conversationId,
            String prompt
    ) {
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of(
                        "text",
                        "requesterId=" + safe(requesterId)
                                + ", conversationId=" + safe(conversationId)
                                + "\n"
                                + safe(prompt)
                ))
        ));
        return contents;
    }

    private static String extractTextFromGemini(JsonNode response) {
        JsonNode candidates = response == null ? null : response.get("candidates");
        if (candidates == null || !candidates.isArray()) {
            return null;
        }
        for (JsonNode candidate : candidates) {
            JsonNode parts = candidate.path("content").path("parts");
            if (!parts.isArray()) {
                continue;
            }
            for (JsonNode part : parts) {
                String text = textValue(part, "text");
                if (StringUtils.hasText(text)) {
                    return text;
                }
            }
        }
        return null;
    }

    private static String extractImageDataUrlFromGemini(JsonNode response) {
        JsonNode candidates = response == null ? null : response.get("candidates");
        if (candidates == null || !candidates.isArray()) {
            return null;
        }
        for (JsonNode candidate : candidates) {
            JsonNode parts = candidate.path("content").path("parts");
            if (!parts.isArray()) {
                continue;
            }
            for (JsonNode part : parts) {
                JsonNode inlineData = part.get("inlineData");
                if (inlineData == null || inlineData.isNull()) {
                    continue;
                }
                String data = textValue(inlineData, "data");
                if (!StringUtils.hasText(data)) {
                    continue;
                }
                String mimeType = firstNonBlank(textValue(inlineData, "mimeType"), "image/png");
                if (data.startsWith("data:")) {
                    return data;
                }
                if (!isBase64(data)) {
                    continue;
                }
                return "data:" + mimeType + ";base64," + data;
            }
        }
        return null;
    }

    private static MentionCommand parseMentionCommand(String content) {
        if (!StringUtils.hasText(content)) {
            return null;
        }

        String trimmed = content.trim();
        String lowered = trimmed.toLowerCase(Locale.ROOT);
        if (lowered.startsWith(UNICALL_IMAGE_MENTION)) {
            String prompt = trimmed.substring(UNICALL_IMAGE_MENTION.length()).trim();
            if (!StringUtils.hasText(prompt)) {
                prompt = "Tạo một hình ảnh theo chủ đề ngẫu nhiên, phong cách hiện đại.";
            }
            return new MentionCommand(MentionType.IMAGE, prompt);
        }

        if (lowered.startsWith(UNICALL_MENTION)) {
            String prompt = trimmed.substring(UNICALL_MENTION.length()).trim();
            if (!StringUtils.hasText(prompt)) {
                prompt = "Chào UniCall, hãy giới thiệu ngắn gọn bạn có thể giúp gì.";
            }
            return new MentionCommand(MentionType.CHAT, prompt);
        }
        return null;
    }

    private static AiAssistantReply disabledReply(MentionCommand command, boolean enabled, boolean hasApiKey) {
        String reason;
        if (!enabled && !hasApiKey) {
            reason = "AI_ASSISTANT_ENABLED=false và thiếu AI_ASSISTANT_API_KEY";
        } else if (!enabled) {
            reason = "AI_ASSISTANT_ENABLED=false";
        } else {
            reason = "thiếu AI_ASSISTANT_API_KEY";
        }

        if (command.type == MentionType.IMAGE) {
            return new AiAssistantReply(
                    UNICALL_IMAGE_BOT_ID,
                    "UniCallImage chưa sẵn sàng (" + reason + ").",
                    null
            );
        }
        return new AiAssistantReply(
                UNICALL_BOT_ID,
                "UniCall AI chưa sẵn sàng (" + reason + ").",
                null
        );
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private static boolean isBase64(String value) {
        try {
            Base64.getDecoder().decode(value);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private static String textValue(JsonNode node, String fieldName) {
        if (node == null || !node.has(fieldName) || node.get(fieldName).isNull()) {
            return null;
        }
        String value = node.get(fieldName).asText(null);
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value.trim();
            }
        }
        return null;
    }

    private String buildImageErrorMessage(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        String body = firstNonBlank(ex.getResponseBodyAsString(), "");
        String loweredBody = body.toLowerCase(Locale.ROOT);

        if (status == 429 || loweredBody.contains("quota") || loweredBody.contains("resource_exhausted")) {
            return "UniCallImage đã hết gói miễn phí Gemini API. Hãy chờ làm mới lượt hoặc đổi key/project có gói phù hợp.";
        }
        if (status == 404 || loweredBody.contains("not found")) {
            return "Model ảnh Gemini không tồn tại hoặc không hỗ trợ endpoint hiện tại. Kiểm tra AI_ASSISTANT_IMAGE_MODEL.";
        }
        if (status == 400 && loweredBody.contains("does not support") && loweredBody.contains("image")) {
            return "Model hiện tại không hỗ trợ trả ảnh. Hãy đổi sang model hỗ trợ image generation.";
        }
        if (status == 403 || loweredBody.contains("permission") || loweredBody.contains("billing")) {
            return "Key Gemini chưa có quyền tạo ảnh hoặc chưa bật billing cho project.";
        }
        return "UniCallImage tạm thời lỗi khi gọi Gemini. Bạn thử lại sau nhé.";
    }

    private record MentionCommand(MentionType type, String prompt) {
    }

    private enum MentionType {
        CHAT,
        IMAGE
    }
}
