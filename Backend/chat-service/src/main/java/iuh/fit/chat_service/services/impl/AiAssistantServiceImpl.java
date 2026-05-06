package iuh.fit.chat_service.services.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.chat_service.clients.GrpcUserServiceClient;
import iuh.fit.chat_service.config.AiAssistantProperties;
import iuh.fit.chat_service.entities.AiMessageVector;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.repositories.AiMessageVectorRepository;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.services.AiAssistantService;
import iuh.fit.chat_service.services.ChatStatisticsService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiAssistantServiceImpl implements AiAssistantService {
    private final AiAssistantProperties properties;
    private final ObjectMapper objectMapper;
    private final ChatStatisticsService chatStatisticsService;
    private final GrpcUserServiceClient grpcUserServiceClient;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final AiMessageVectorRepository aiMessageVectorRepository;

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int DEFAULT_CONTEXT_MESSAGE_LIMIT = 12;
    private static final int SUMMARY_CONTEXT_MESSAGE_LIMIT = 90;
    private static final int MAX_MEMORY_NOTES = 20;
    private static final int MAX_EMBEDDING_INPUT_CHARS = 1200;
    private final ConcurrentMap<String, UserMemoryState> userMemoryByScope = new ConcurrentHashMap<>();

    @PostConstruct
    void logAiAssistantConfig() {
        log.info(
                "[ai-assistant] enabled={}, hasApiKey={}, textModel={}, imageProvider={}, imageModel={}, hasStabilityKey={}, vectorEnabled={}, embeddingModel={}",
                properties.isEnabled(),
                StringUtils.hasText(properties.getApiKey()),
                safe(properties.getTextModel()),
                safe(properties.getImageProvider()),
                safe(properties.getImageModel()),
                StringUtils.hasText(properties.getStabilityApiKey()),
                properties.isVectorEnabled(),
                safe(properties.getEmbeddingModel())
        );
    }

    @Override
    public Optional<AiAssistantReply> buildReply(String conversationId, String requesterId, String content) {
        MentionCommand command = parseMentionCommand(content);
        if (command == null) {
            return Optional.empty();
        }

        if (command.type == MentionType.CHAT) {
            if (isMemoryEnablePrompt(command.prompt)) {
                return Optional.of(enableMemoryReply(conversationId, requesterId));
            }
            if (isMemoryDisablePrompt(command.prompt)) {
                return Optional.of(disableMemoryReply(conversationId, requesterId));
            }
            if (isMemoryClearPrompt(command.prompt)) {
                return Optional.of(clearMemoryReply(conversationId, requesterId));
            }
            String memoryNote = extractMemoryNote(command.prompt);
            if (StringUtils.hasText(memoryNote)) {
                return Optional.of(saveMemoryNoteReply(conversationId, requesterId, memoryNote));
            }
            if (isChatStatsPrompt(command.prompt)) {
                return Optional.of(buildChatStatsReply(conversationId, requesterId, command.prompt));
            }
            if (isConversationSummaryPrompt(command.prompt)) {
                return Optional.of(buildConversationSummaryReply(conversationId, requesterId, command.prompt));
            }
            if (isActionItemsPrompt(command.prompt)) {
                return Optional.of(buildActionItemsReply(conversationId, requesterId, command.prompt));
            }
        }

        boolean enabled = properties.isEnabled();
        if (!enabled) {
            return Optional.of(disabledReply(command, false, false));
        }

        if (command.type == MentionType.CHAT && !StringUtils.hasText(properties.getApiKey())) {
            return Optional.of(disabledReply(command, true, false));
        }
        if (command.type == MentionType.IMAGE && !hasImageCredential()) {
            return Optional.of(disabledReply(command, true, false));
        }

        return switch (command.type) {
            case CHAT -> Optional.of(buildChatReply(conversationId, requesterId, command.prompt));
            case IMAGE -> Optional.of(buildImageReply(conversationId, requesterId, command.prompt));
        };
    }

    private AiAssistantReply buildChatStatsReply(String conversationId, String requesterId, String prompt) {
        try {
            Integer periodDays = extractStatsPeriodDaysFromPrompt(prompt);
            ChatStatisticsService.ConversationStats stats =
                    chatStatisticsService.summarizeConversation(conversationId, requesterId, periodDays);

            long totalMessages = stats.totalMessages();
            long requesterSentMessages = stats.requesterSentMessages();
            long counterpartSentMessages = stats.counterpartSentMessages();
            long aiSentMessages = stats.aiSentMessages();
            long othersSentMessages = Math.max(0L, totalMessages - requesterSentMessages - aiSentMessages);
            long activeDays = stats.activeDays();
            long requesterPercent = totalMessages <= 0
                    ? 0
                    : Math.round((double) requesterSentMessages * 100.0 / (double) totalMessages);

            String firstAt = stats.firstMessageAt() == null
                    ? "chưa có"
                    : stats.firstMessageAt().format(DATE_TIME_FORMATTER);
            String lastAt = stats.lastMessageAt() == null
                    ? "chưa có"
                    : stats.lastMessageAt().format(DATE_TIME_FORMATTER);

            String title = periodDays == null
                    ? "Thống kê chat (toàn bộ hội thoại hiện tại):"
                    : "Thống kê chat (" + periodDays + " ngày gần nhất):";
            String answer = title + "\n"
                    + "- Tổng tin nhắn: " + totalMessages + "\n"
                    + "- Bạn đã gửi: " + requesterSentMessages + " tin (" + requesterPercent + "%)\n"
                    + (stats.groupConversation()
                    ? "- Các thành viên khác đã gửi: " + othersSentMessages + " tin\n"
                    : "- " + resolveCounterpartDisplayName(stats.counterpartAccountId(), requesterId)
                    + " đã gửi: " + counterpartSentMessages + " tin\n")
                    + "- UniCall AI đã gửi: " + aiSentMessages + " tin\n"
                    + "- Số ngày có tin nhắn: " + activeDays + " ngày\n"
                    + "- Tin nhắn đầu tiên: " + firstAt + "\n"
                    + "- Tin nhắn gần nhất: " + lastAt;

            if (stats.groupConversation()) {
                ChatStatisticsService.TopSenderStat topSender = stats.topSender();
                if (topSender == null) {
                    answer += "\n- Top người gửi nhiều nhất: chưa có dữ liệu";
                } else {
                    String senderLabel = topSender.accountId().equals(requesterId)
                            ? "Bạn"
                            : topSender.accountId();
                    answer += "\n- Top người gửi nhiều nhất: " + senderLabel
                            + " (" + topSender.messageCount() + " tin)";
                }
            }

            return new AiAssistantReply(UNICALL_BOT_ID, answer, null);
        } catch (Exception ex) {
            log.warn("Chat statistics failed", ex);
            return new AiAssistantReply(
                    UNICALL_BOT_ID,
                    "Không lấy được thống kê chat lúc này. Bạn thử lại sau nhé.",
                    null
            );
        }
    }

    private AiAssistantReply buildConversationSummaryReply(String conversationId, String requesterId, String prompt) {
        try {
            Integer periodDays = extractStatsPeriodDaysFromPrompt(prompt);
            String task = periodDays == null
                    ? "Tóm tắt ngắn gọn cuộc trò chuyện hiện tại theo 4 mục: chủ đề chính, điểm nổi bật, cảm xúc/tổng quan, kết luận."
                    : "Tóm tắt cuộc trò chuyện trong " + periodDays
                    + " ngày gần nhất theo 4 mục: chủ đề chính, điểm nổi bật, cảm xúc/tổng quan, kết luận.";

            JsonNode response = callGeminiGenerateContent(
                    properties.getTextModel(),
                    buildGeminiContents(requesterId, conversationId, prompt, task, SUMMARY_CONTEXT_MESSAGE_LIMIT, periodDays, false),
                    properties.getTextSystemPrompt(),
                    false
            );
            String answer = firstNonBlank(
                    extractTextFromGemini(response),
                    "Chưa đủ dữ liệu để tóm tắt. Bạn hãy chat thêm rồi thử lại nhé."
            );
            return new AiAssistantReply(UNICALL_BOT_ID, answer, null);
        } catch (RestClientResponseException ex) {
            String userMessage = buildChatErrorMessage(ex);
            log.warn(
                    "Gemini summary failed: status={}, body={}",
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString()
            );
            return new AiAssistantReply(UNICALL_BOT_ID, userMessage, null);
        } catch (Exception ex) {
            log.warn("Gemini summary failed: {}", ex.getMessage());
            return new AiAssistantReply(
                    UNICALL_BOT_ID,
                    "Không tóm tắt được lúc này. Bạn thử lại sau nhé.",
                    null
            );
        }
    }

    private AiAssistantReply buildActionItemsReply(String conversationId, String requesterId, String prompt) {
        try {
            Integer periodDays = extractStatsPeriodDaysFromPrompt(prompt);
            String task = periodDays == null
                    ? "Rút action items từ cuộc trò chuyện hiện tại. Trả về danh sách gạch đầu dòng: việc cần làm, người phụ trách đề xuất, deadline đề xuất."
                    : "Rút action items trong " + periodDays
                    + " ngày gần nhất. Trả về danh sách gạch đầu dòng: việc cần làm, người phụ trách đề xuất, deadline đề xuất.";

            JsonNode response = callGeminiGenerateContent(
                    properties.getTextModel(),
                    buildGeminiContents(requesterId, conversationId, prompt, task, SUMMARY_CONTEXT_MESSAGE_LIMIT, periodDays, false),
                    properties.getTextSystemPrompt(),
                    false
            );
            String answer = firstNonBlank(
                    extractTextFromGemini(response),
                    "Chưa rút được action items rõ ràng từ nội dung hiện tại."
            );
            return new AiAssistantReply(UNICALL_BOT_ID, answer, null);
        } catch (RestClientResponseException ex) {
            String userMessage = buildChatErrorMessage(ex);
            log.warn(
                    "Gemini action items failed: status={}, body={}",
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString()
            );
            return new AiAssistantReply(UNICALL_BOT_ID, userMessage, null);
        } catch (Exception ex) {
            log.warn("Gemini action items failed: {}", ex.getMessage());
            return new AiAssistantReply(
                    UNICALL_BOT_ID,
                    "Không rút được action items lúc này. Bạn thử lại sau nhé.",
                    null
            );
        }
    }

    private AiAssistantReply enableMemoryReply(String conversationId, String requesterId) {
        UserMemoryState state = getOrCreateMemoryState(conversationId, requesterId);
        state.setEnabled(true);
        return new AiAssistantReply(
                UNICALL_BOT_ID,
                "Đã bật ghi nhớ cho bạn trong cuộc trò chuyện này. Dùng '@Unicall ghi nhớ: ...' để thêm sở thích.",
                null
        );
    }

    private AiAssistantReply disableMemoryReply(String conversationId, String requesterId) {
        UserMemoryState state = getOrCreateMemoryState(conversationId, requesterId);
        state.setEnabled(false);
        return new AiAssistantReply(
                UNICALL_BOT_ID,
                "Đã tắt ghi nhớ cho bạn trong cuộc trò chuyện này. Dữ liệu ghi nhớ vẫn được giữ cho đến khi bạn xóa.",
                null
        );
    }

    private AiAssistantReply clearMemoryReply(String conversationId, String requesterId) {
        userMemoryByScope.remove(memoryScopeKey(conversationId, requesterId));
        return new AiAssistantReply(
                UNICALL_BOT_ID,
                "Đã xóa toàn bộ ghi nhớ cá nhân của bạn trong cuộc trò chuyện này.",
                null
        );
    }

    private AiAssistantReply saveMemoryNoteReply(String conversationId, String requesterId, String note) {
        UserMemoryState state = getOrCreateMemoryState(conversationId, requesterId);
        state.setEnabled(true);
        state.addNote(note);
        return new AiAssistantReply(
                UNICALL_BOT_ID,
                "Đã ghi nhớ: " + note,
                null
        );
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
        } catch (RestClientResponseException ex) {
            String userMessage = buildChatErrorMessage(ex);
            log.warn(
                    "Gemini chat failed: status={}, body={}",
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString()
            );
            return new AiAssistantReply(UNICALL_BOT_ID, userMessage, null);
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
        if (isStabilityImageProvider()) {
            return buildImageReplyWithStability(prompt);
        }
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

    private AiAssistantReply buildImageReplyWithStability(String prompt) {
        try {
            String imageDataUrl = callStabilityGenerateImage(prompt);
            if (!StringUtils.hasText(imageDataUrl)) {
                return new AiAssistantReply(
                        UNICALL_IMAGE_BOT_ID,
                        "Mình chưa tạo được ảnh lúc này. Bạn thử lại với prompt khác nhé.",
                        null
                );
            }
            return new AiAssistantReply(
                    UNICALL_IMAGE_BOT_ID,
                    "Mình đã tạo ảnh theo yêu cầu của bạn.",
                    imageDataUrl
            );
        } catch (RestClientResponseException ex) {
            String userMessage = buildStabilityImageErrorMessage(ex);
            log.warn(
                    "Stability image failed: status={}, body={}",
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString()
            );
            return new AiAssistantReply(UNICALL_IMAGE_BOT_ID, userMessage, null);
        } catch (Exception ex) {
            log.warn("Stability image failed: {}", ex.getMessage());
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

    private List<Map<String, Object>> buildGeminiContents(
            String requesterId,
            String conversationId,
            String prompt
    ) {
        return buildGeminiContents(
                requesterId,
                conversationId,
                prompt,
                null,
                DEFAULT_CONTEXT_MESSAGE_LIMIT,
                null,
                true
        );
    }

    private List<Map<String, Object>> buildGeminiContents(
            String requesterId,
            String conversationId,
            String prompt,
            String taskInstruction,
            int recentLimit,
            Integer periodDays,
            boolean includeAiMessages
    ) {
        String recentContext = buildRecentConversationContext(
                conversationId,
                requesterId,
                Math.max(1, recentLimit),
                periodDays,
                includeAiMessages
        );
        String semanticContext = buildSemanticConversationContext(
                conversationId,
                requesterId,
                prompt,
                periodDays,
                includeAiMessages
        );
        String conversationMeta = buildConversationMetaContext(conversationId, requesterId);
        String memoryContext = buildUserMemoryContext(conversationId, requesterId);
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of(
                        "text",
                        "requesterId=" + safe(requesterId)
                                + ", conversationId=" + safe(conversationId)
                                + "\nconversation_meta:\n" + conversationMeta
                                + "\nuser_memory:\n" + memoryContext
                                + "\nsemantic_context:\n" + semanticContext
                                + "\nrecent_history:\n" + recentContext
                                + (StringUtils.hasText(taskInstruction)
                                ? "\nassistant_task:\n" + taskInstruction.trim()
                                : "")
                                + "\n"
                                + safe(prompt)
                ))
        ));
        return contents;
    }

    private String callStabilityGenerateImage(String prompt) throws Exception {
        StabilityTarget target = resolveStabilityTarget();
        String endpoint = target.endpoint();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(1000, properties.getConnectTimeoutMs()));
        requestFactory.setReadTimeout(Math.max(1000, properties.getReadTimeoutMs()));
        RestTemplate restTemplate = new RestTemplate(requestFactory);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setAccept(List.of(MediaType.parseMediaType("image/*")));
        headers.setBearerAuth(properties.getStabilityApiKey().trim());

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("prompt", safe(prompt));
        body.add("output_format", firstNonBlank(properties.getStabilityOutputFormat(), "png"));
        if (StringUtils.hasText(target.model())) {
            body.add("model", target.model());
        }

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<byte[]> response = restTemplate.exchange(endpoint, HttpMethod.POST, request, byte[].class);
        byte[] imageBytes = response.getBody();
        if (imageBytes == null || imageBytes.length == 0) {
            return null;
        }

        String mimeType = switch (firstNonBlank(properties.getStabilityOutputFormat(), "png").toLowerCase(Locale.ROOT)) {
            case "jpeg", "jpg" -> "image/jpeg";
            case "webp" -> "image/webp";
            default -> "image/png";
        };
        String encoded = Base64.getEncoder().encodeToString(imageBytes);
        return "data:" + mimeType + ";base64," + encoded;
    }

    private StabilityTarget resolveStabilityTarget() {
        String configuredModel = firstNonBlank(properties.getStabilityImageModel(), "stable-image-core");
        String normalized = configuredModel.toLowerCase(Locale.ROOT).trim();
        String baseUrl = safe(properties.getStabilityBaseUrl());

        if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
            return new StabilityTarget(configuredModel.trim(), null);
        }
        if (normalized.startsWith("/")) {
            return new StabilityTarget(baseUrl + normalized, null);
        }
        if (normalized.contains("/v2beta/")) {
            return new StabilityTarget(baseUrl + "/" + normalized, null);
        }
        if ("core".equals(normalized) || "stable-image-core".equals(normalized)) {
            return new StabilityTarget(baseUrl + "/v2beta/stable-image/generate/core", null);
        }
        if ("ultra".equals(normalized) || "stable-image-ultra".equals(normalized)) {
            return new StabilityTarget(baseUrl + "/v2beta/stable-image/generate/ultra", null);
        }

        return new StabilityTarget(baseUrl + "/v2beta/stable-image/generate/sd3", configuredModel.trim());
    }

    private String buildConversationMetaContext(String conversationId, String requesterId) {
        try {
            Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
            if (conversationOpt.isEmpty()) {
                return "(không có dữ liệu)";
            }
            Conversation conversation = conversationOpt.get();
            List<ParticipantInfo> participants = conversation.getParticipantInfos();
            if (participants == null) {
                participants = List.of();
            }

            StringBuilder builder = new StringBuilder();
            builder.append("type=").append(conversation.getType()).append('\n');
            builder.append("numberMember=").append(conversation.getNumberMember()).append('\n');
            builder.append("participants:\n");
            for (ParticipantInfo participant : participants) {
                if (participant == null || !StringUtils.hasText(participant.getIdAccount())) {
                    continue;
                }
                String id = participant.getIdAccount();
                String display = resolveSenderLabel(id, requesterId);
                builder.append("- id=").append(id)
                        .append(", displayName=").append(display)
                        .append(", role=").append(participant.getRole())
                        .append('\n');
            }
            String output = builder.toString().trim();
            return output.isBlank() ? "(không có dữ liệu)" : output;
        } catch (Exception ex) {
            log.debug("Cannot build conversation meta context: {}", ex.getMessage());
            return "(không có dữ liệu)";
        }
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

    private String buildSemanticConversationContext(
            String conversationId,
            String requesterId,
            String prompt,
            Integer periodDays,
            boolean includeAiMessages
    ) {
        if (!properties.isVectorEnabled()) {
            return "(vector_off)";
        }
        if (!StringUtils.hasText(properties.getApiKey()) || !StringUtils.hasText(properties.getEmbeddingModel())) {
            return "(vector_missing_config)";
        }

        String normalizedPrompt = normalizePrompt(firstNonBlank(prompt, ""));
        if (!StringUtils.hasText(normalizedPrompt)) {
            return "(khong co du lieu)";
        }

        try {
            int candidateLimit = Math.max(10, properties.getVectorCandidateLimit());
            LocalDateTime fromTime = periodDays == null
                    ? null
                    : LocalDateTime.now().minusDays(Math.max(1, periodDays));
            boolean allowAiMessages = includeAiMessages && properties.isVectorIncludeAiMessages();
            String embeddingModel = properties.getEmbeddingModel().trim();

            List<Message> candidateMessages = messageRepository
                    .findByIdConversationOrderByTimeSentDesc(
                            conversationId,
                            PageRequest.of(0, candidateLimit, Sort.by(Sort.Direction.DESC, "timeSent"))
                    )
                    .getContent();
            if (candidateMessages.isEmpty()) {
                return "(khong co du lieu)";
            }

            List<VectorCandidate> candidates = new ArrayList<>();
            for (Message message : candidateMessages) {
                if (!shouldIncludeMessageForSemantic(message, fromTime, allowAiMessages)) {
                    continue;
                }
                String semanticText = extractSemanticText(message.getContent());
                if (!StringUtils.hasText(semanticText)) {
                    continue;
                }
                candidates.add(new VectorCandidate(message, semanticText));
            }
            if (candidates.isEmpty()) {
                return "(khong co du lieu)";
            }

            Set<String> messageIds = new HashSet<>();
            for (VectorCandidate candidate : candidates) {
                messageIds.add(candidate.message().getIdMessage());
            }

            Map<String, AiMessageVector> vectorsByMessageId = new LinkedHashMap<>();
            aiMessageVectorRepository.findByIdConversationAndEmbeddingModelAndIdMessageIn(
                            conversationId,
                            embeddingModel,
                            messageIds
                    )
                    .forEach(vector -> vectorsByMessageId.put(vector.getIdMessage(), vector));

            int indexedNow = 0;
            int maxNew = Math.max(0, properties.getVectorMaxNewEmbeddingsPerRequest());
            for (VectorCandidate candidate : candidates) {
                String messageId = candidate.message().getIdMessage();
                AiMessageVector existing = vectorsByMessageId.get(messageId);
                if (existing != null && existing.getEmbeddingValues() != null && !existing.getEmbeddingValues().isEmpty()) {
                    continue;
                }
                if (indexedNow >= maxNew) {
                    continue;
                }
                AiMessageVector saved = upsertMessageVector(embeddingModel, candidate);
                if (saved != null && saved.getEmbeddingValues() != null && !saved.getEmbeddingValues().isEmpty()) {
                    vectorsByMessageId.put(messageId, saved);
                    indexedNow += 1;
                }
            }

            List<Double> queryEmbedding = callGeminiEmbedContent(
                    embeddingModel,
                    trimForEmbedding(normalizedPrompt),
                    "RETRIEVAL_QUERY"
            );
            if (queryEmbedding.isEmpty()) {
                return "(khong co du lieu)";
            }

            List<SemanticMatch> matches = new ArrayList<>();
            for (VectorCandidate candidate : candidates) {
                AiMessageVector vector = vectorsByMessageId.get(candidate.message().getIdMessage());
                if (vector == null || vector.getEmbeddingValues() == null || vector.getEmbeddingValues().isEmpty()) {
                    continue;
                }
                double score = cosineSimilarity(queryEmbedding, vector.getEmbeddingValues());
                if (score >= properties.getVectorMinScore()) {
                    matches.add(new SemanticMatch(candidate.message(), candidate.semanticText(), score));
                }
            }

            if (matches.isEmpty()) {
                return "(khong co du lieu)";
            }

            matches.sort((a, b) -> Double.compare(b.score(), a.score()));
            int topK = Math.max(1, properties.getVectorTopK());
            StringBuilder output = new StringBuilder();
            int count = 0;
            Set<String> uniqueTexts = new LinkedHashSet<>();
            for (SemanticMatch match : matches) {
                if (count >= topK) {
                    break;
                }
                String uniqueKey = normalizePrompt(match.text());
                if (!StringUtils.hasText(uniqueKey) || !uniqueTexts.add(uniqueKey)) {
                    continue;
                }
                String senderLabel = resolveSenderLabel(match.message().getIdAccountSent(), requesterId);
                output.append("- [")
                        .append(senderLabel)
                        .append(" | score=")
                        .append(String.format(Locale.US, "%.3f", match.score()))
                        .append("] ")
                        .append(match.text())
                        .append('\n');
                count += 1;
            }

            String context = output.toString().trim();
            return context.isBlank() ? "(khong co du lieu)" : context;
        } catch (RestClientResponseException ex) {
            log.warn(
                    "Gemini embedding failed: status={}, body={}",
                    ex.getStatusCode().value(),
                    ex.getResponseBodyAsString()
            );
            return "(semantic_unavailable)";
        } catch (Exception ex) {
            log.debug("Cannot build semantic vector context: {}", ex.getMessage());
            return "(semantic_unavailable)";
        }
    }

    private AiMessageVector upsertMessageVector(String embeddingModel, VectorCandidate candidate) {
        try {
            List<Double> embedding = callGeminiEmbedContent(
                    embeddingModel,
                    trimForEmbedding(candidate.semanticText()),
                    "RETRIEVAL_DOCUMENT"
            );
            if (embedding.isEmpty()) {
                return null;
            }

            Message message = candidate.message();
            AiMessageVector entity = aiMessageVectorRepository
                    .findByIdMessageAndEmbeddingModel(message.getIdMessage(), embeddingModel)
                    .orElseGet(AiMessageVector::new);
            entity.setIdMessage(message.getIdMessage());
            entity.setIdConversation(message.getIdConversation());
            entity.setIdAccountSent(message.getIdAccountSent());
            entity.setTimeSent(message.getTimeSent());
            entity.setEmbeddingModel(embeddingModel);
            entity.setNormalizedText(normalizePrompt(candidate.semanticText()));
            entity.setContentPreview(trimForEmbedding(candidate.semanticText()));
            entity.setEmbeddingValues(embedding);
            entity.setUpdatedAt(LocalDateTime.now());
            return aiMessageVectorRepository.save(entity);
        } catch (Exception ex) {
            log.debug("Cannot upsert message vector: {}", ex.getMessage());
            return null;
        }
    }

    private List<Double> callGeminiEmbedContent(String model, String text, String taskType) throws Exception {
        if (!StringUtils.hasText(model) || !StringUtils.hasText(text)) {
            return List.of();
        }

        String endpoint = properties.getBaseUrl().trim()
                + "/models/" + model.trim()
                + ":embedContent?key=" + properties.getApiKey().trim();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(1000, properties.getConnectTimeoutMs()));
        requestFactory.setReadTimeout(Math.max(1000, properties.getReadTimeoutMs()));
        RestTemplate restTemplate = new RestTemplate(requestFactory);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", "models/" + model.trim());
        body.put("content", Map.of("parts", List.of(Map.of("text", text))));
        body.put("taskType", firstNonBlank(taskType, "RETRIEVAL_DOCUMENT"));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.POST, request, String.class);
        String rawBody = response.getBody();
        if (!StringUtils.hasText(rawBody)) {
            return List.of();
        }

        JsonNode root = objectMapper.readTree(rawBody);
        JsonNode valuesNode = root.path("embedding").path("values");
        if (!valuesNode.isArray() || valuesNode.isEmpty()) {
            return List.of();
        }

        List<Double> values = new ArrayList<>();
        for (JsonNode valueNode : valuesNode) {
            if (valueNode == null || !valueNode.isNumber()) {
                continue;
            }
            values.add(valueNode.asDouble());
        }
        return values;
    }

    private static String extractSemanticText(String content) {
        if (!StringUtils.hasText(content)) {
            return null;
        }
        String trimmed = content.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private boolean shouldIncludeMessageForSemantic(
            Message message,
            LocalDateTime fromTime,
            boolean includeAiMessages
    ) {
        if (message == null || message.isRecalled()) {
            return false;
        }
        if (fromTime != null && message.getTimeSent() != null && message.getTimeSent().isBefore(fromTime)) {
            return false;
        }
        if (!includeAiMessages
                && (UNICALL_BOT_ID.equals(message.getIdAccountSent())
                || UNICALL_IMAGE_BOT_ID.equals(message.getIdAccountSent()))) {
            return false;
        }
        String content = extractSemanticText(message.getContent());
        if (!StringUtils.hasText(content)) {
            return false;
        }
        String normalized = normalizePrompt(content);
        return normalized.length() >= Math.max(1, properties.getVectorMinTextLength());
    }

    private static String trimForEmbedding(String text) {
        if (!StringUtils.hasText(text)) {
            return "";
        }
        String trimmed = text.trim();
        if (trimmed.length() <= MAX_EMBEDDING_INPUT_CHARS) {
            return trimmed;
        }
        return trimmed.substring(0, MAX_EMBEDDING_INPUT_CHARS);
    }

    private static double cosineSimilarity(List<Double> left, List<Double> right) {
        if (left == null || right == null || left.isEmpty() || right.isEmpty()) {
            return -1d;
        }
        int size = Math.min(left.size(), right.size());
        if (size == 0) {
            return -1d;
        }

        double dot = 0d;
        double leftNorm = 0d;
        double rightNorm = 0d;
        for (int i = 0; i < size; i++) {
            Double lv = left.get(i);
            Double rv = right.get(i);
            if (lv == null || rv == null) {
                continue;
            }
            dot += lv * rv;
            leftNorm += lv * lv;
            rightNorm += rv * rv;
        }
        if (leftNorm <= 0d || rightNorm <= 0d) {
            return -1d;
        }
        return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
    }

    private String buildRecentConversationContext(String conversationId, String requesterId) {
        return buildRecentConversationContext(
                conversationId,
                requesterId,
                DEFAULT_CONTEXT_MESSAGE_LIMIT,
                null,
                true
        );
    }

    private String buildRecentConversationContext(
            String conversationId,
            String requesterId,
            int limit,
            Integer periodDays,
            boolean includeAiMessages
    ) {
        try {
            LocalDateTime fromTime = periodDays == null
                    ? null
                    : LocalDateTime.now().minusDays(Math.max(1, periodDays));
            List<Message> recentMessages = messageRepository
                    .findByIdConversationOrderByTimeSentDesc(
                            conversationId,
                            PageRequest.of(0, Math.max(1, limit), Sort.by(Sort.Direction.DESC, "timeSent"))
                    )
                    .getContent();
            if (recentMessages.isEmpty()) {
                return "(không có dữ liệu)";
            }

            List<Message> ordered = new ArrayList<>(recentMessages);
            ordered.sort(Comparator.comparing(Message::getTimeSent, Comparator.nullsFirst(Comparator.naturalOrder())));

            StringBuilder builder = new StringBuilder();
            for (Message message : ordered) {
                if (message == null || message.isRecalled()) {
                    continue;
                }
                if (!includeAiMessages
                        && (UNICALL_BOT_ID.equals(message.getIdAccountSent())
                        || UNICALL_IMAGE_BOT_ID.equals(message.getIdAccountSent()))) {
                    continue;
                }
                if (fromTime != null && message.getTimeSent() != null && message.getTimeSent().isBefore(fromTime)) {
                    continue;
                }
                String text = firstNonBlank(message.getContent(), "");
                if (text.isBlank()) {
                    if (message.getAttachments() != null && !message.getAttachments().isEmpty()) {
                        text = "[tin nhắn đính kèm tệp]";
                    } else {
                        continue;
                    }
                } else {
                    text = text.trim();
                }
                if (text.isBlank()) {
                    continue;
                }
                String senderLabel = resolveSenderLabel(message.getIdAccountSent(), requesterId);
                builder.append("- ").append(senderLabel).append(": ").append(text).append('\n');
            }
            String output = builder.toString().trim();
            return output.isBlank() ? "(không có dữ liệu)" : output;
        } catch (Exception ex) {
            log.debug("Cannot build recent conversation context: {}", ex.getMessage());
            return "(không có dữ liệu)";
        }
    }

    private String resolveSenderLabel(String senderId, String requesterId) {
        if (!StringUtils.hasText(senderId)) {
            return "Người dùng";
        }
        if (requesterId.equals(senderId)) {
            return "Bạn";
        }
        if (UNICALL_BOT_ID.equals(senderId) || UNICALL_IMAGE_BOT_ID.equals(senderId)) {
            return "UniCall AI";
        }
        return grpcUserServiceClient.getUserDisplayInfo(senderId)
                .map(GrpcUserServiceClient.UserDisplayInfo::displayName)
                .filter(StringUtils::hasText)
                .orElse(senderId);
    }

    private String resolveCounterpartDisplayName(String counterpartId, String requesterId) {
        if (!StringUtils.hasText(counterpartId)) {
            return "Đối phương";
        }
        if (counterpartId.equals(requesterId)) {
            return "Bạn";
        }
        return grpcUserServiceClient.getUserDisplayInfo(counterpartId)
                .map(GrpcUserServiceClient.UserDisplayInfo::displayName)
                .filter(StringUtils::hasText)
                .orElse(counterpartId);
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

    private static boolean isChatStatsPrompt(String prompt) {
        if (!StringUtils.hasText(prompt)) {
            return false;
        }
        String normalized = normalizePrompt(prompt);
        return normalized.equals("thong ke chat")
                || normalized.equals("thong ke chat 7 ngay")
                || normalized.equals("thong ke chat 30 ngay")
                || normalized.equals("top nguoi gui nhieu nhat")
                || normalized.equals("top nguoi gui nhieu");
    }

    private Integer extractStatsPeriodDaysFromPrompt(String prompt) {
        String normalized = normalizePrompt(prompt);
        if (normalized.contains("30 ngay") || normalized.contains("1 thang")) {
            return 30;
        }
        if (normalized.contains("7 ngay") || normalized.contains("1 tuan") || normalized.contains("tuan nay")) {
            return 7;
        }
        Matcher matcher = Pattern.compile("\\b(\\d{1,3})\\s*ngay\\b").matcher(normalized);
        if (matcher.find()) {
            try {
                int days = Integer.parseInt(matcher.group(1));
                if (days > 0 && days <= 365) {
                    return days;
                }
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private static String normalizePrompt(String value) {
        String lowered = value.toLowerCase(Locale.ROOT)
                .replace('\u0111', 'd');
        String noAccent = Normalizer.normalize(lowered, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return noAccent
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static boolean isConversationSummaryPrompt(String prompt) {
        if (!StringUtils.hasText(prompt)) {
            return false;
        }
        String normalized = normalizePrompt(prompt);
        return normalized.equals("tom tat chat")
                || normalized.equals("tom tat chat 7 ngay")
                || normalized.equals("tom tat chat 30 ngay");
    }

    private static boolean isActionItemsPrompt(String prompt) {
        if (!StringUtils.hasText(prompt)) {
            return false;
        }
        String normalized = normalizePrompt(prompt);
        return normalized.equals("rut action items")
                || normalized.equals("rut action items 7 ngay")
                || normalized.equals("rut action items 30 ngay");
    }

    private static boolean isMemoryEnablePrompt(String prompt) {
        if (!StringUtils.hasText(prompt)) {
            return false;
        }
        String normalized = normalizePrompt(prompt);
        return normalized.equals("bat ghi nho ai")
                || normalized.equals("bat ghi nho")
                || normalized.equals("mo ghi nho ai")
                || normalized.equals("mo ghi nho");
    }

    private static boolean isMemoryDisablePrompt(String prompt) {
        if (!StringUtils.hasText(prompt)) {
            return false;
        }
        String normalized = normalizePrompt(prompt);
        return normalized.equals("tat ghi nho ai")
                || normalized.equals("tat ghi nho")
                || normalized.equals("dung ghi nho ai")
                || normalized.equals("dung ghi nho");
    }

    private static boolean isMemoryClearPrompt(String prompt) {
        if (!StringUtils.hasText(prompt)) {
            return false;
        }
        String normalized = normalizePrompt(prompt);
        return normalized.equals("xoa ghi nho");
    }

    private static String extractMemoryNote(String prompt) {
        if (!StringUtils.hasText(prompt)) {
            return null;
        }
        String normalized = normalizePrompt(prompt);
        if (!normalized.startsWith("ghi nho") && !normalized.startsWith("nho giu") && !normalized.startsWith("remember")) {
            return null;
        }
        String extracted = prompt.trim().replaceFirst("(?i)^(ghi\\s*nho|nho\\s*giu|remember)\\s*[:\\-]?\\s*", "").trim();
        if (!StringUtils.hasText(extracted)) {
            return null;
        }
        return extracted;
    }

    private UserMemoryState getOrCreateMemoryState(String conversationId, String requesterId) {
        return userMemoryByScope.computeIfAbsent(
                memoryScopeKey(conversationId, requesterId),
                key -> new UserMemoryState()
        );
    }

    private String buildUserMemoryContext(String conversationId, String requesterId) {
        UserMemoryState state = userMemoryByScope.get(memoryScopeKey(conversationId, requesterId));
        if (state == null || !state.isEnabled()) {
            return "(memory_off)";
        }
        List<String> notes = state.getNotes();
        if (notes.isEmpty()) {
            return "(memory_enabled_no_notes)";
        }
        StringBuilder builder = new StringBuilder();
        for (String note : notes) {
            if (!StringUtils.hasText(note)) {
                continue;
            }
            builder.append("- ").append(note.trim()).append('\n');
        }
        String output = builder.toString().trim();
        return output.isBlank() ? "(memory_enabled_no_notes)" : output;
    }

    private static String memoryScopeKey(String conversationId, String requesterId) {
        return safe(conversationId) + "::" + safe(requesterId);
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

    private String buildStabilityImageErrorMessage(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        String body = firstNonBlank(ex.getResponseBodyAsString(), "");
        String loweredBody = body.toLowerCase(Locale.ROOT);
        boolean invalidApiKey = loweredBody.contains("invalid api key")
                || loweredBody.contains("api key is invalid")
                || loweredBody.contains("authentication credentials were not provided")
                || loweredBody.contains("unauthorized");

        if (status == 401 || invalidApiKey) {
            return "Stability API key không hợp lệ. Hãy kiểm tra STABILITY_API_KEY.";
        }
        if (status == 402 || loweredBody.contains("credit") || loweredBody.contains("insufficient")) {
            return "Tài khoản Stability không đủ credit để tạo ảnh.";
        }
        if (status == 403) {
            return "Tài khoản Stability chưa có quyền gọi model ảnh hiện tại.";
        }
        if (status == 429 || loweredBody.contains("rate")) {
            return "Stability đang giới hạn tốc độ. Bạn thử lại sau vài giây.";
        }
        if (status == 400 || status == 422) {
            return "Prompt hoặc tham số tạo ảnh chưa hợp lệ.";
        }
        return "UniCallImage tạm thời lỗi khi gọi Stability. Bạn thử lại sau nhé.";
    }

    private boolean isStabilityImageProvider() {
        return "stability".equalsIgnoreCase(firstNonBlank(properties.getImageProvider(), "gemini"));
    }

    private boolean hasImageCredential() {
        if (isStabilityImageProvider()) {
            return StringUtils.hasText(properties.getStabilityApiKey());
        }
        return StringUtils.hasText(properties.getApiKey());
    }

    private String buildChatErrorMessage(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        String body = firstNonBlank(ex.getResponseBodyAsString(), "");
        String loweredBody = body.toLowerCase(Locale.ROOT);

        if (status == 401 || loweredBody.contains("api key not valid")) {
            return "API key Gemini không hợp lệ. Hãy kiểm tra lại AI_ASSISTANT_API_KEY.";
        }
        if (status == 403 || loweredBody.contains("permission") || loweredBody.contains("billing")) {
            return "Key Gemini chưa có quyền truy cập model text hoặc project chưa bật billing.";
        }
        if (status == 429 || loweredBody.contains("quota") || loweredBody.contains("resource_exhausted")) {
            return "UniCall AI đã hết quota Gemini API. Hãy chờ làm mới lượt hoặc đổi project/key.";
        }
        if (status == 404 || loweredBody.contains("not found")) {
            return "Model text Gemini không tồn tại. Kiểm tra AI_ASSISTANT_TEXT_MODEL.";
        }
        if (status == 400 || loweredBody.contains("invalid_argument")) {
            return "Yêu cầu gọi Gemini không hợp lệ. Kiểm tra cấu hình model và payload.";
        }
        return "UniCall AI tạm thời lỗi khi gọi Gemini. Bạn thử lại sau nhé.";
    }

    private record MentionCommand(MentionType type, String prompt) {
    }

    private enum MentionType {
        CHAT,
        IMAGE
    }

    private static final class UserMemoryState {
        private boolean enabled;
        private final List<String> notes = new ArrayList<>();

        boolean isEnabled() {
            return enabled;
        }

        void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        List<String> getNotes() {
            return notes;
        }

        void addNote(String note) {
            if (!StringUtils.hasText(note)) {
                return;
            }
            String normalized = note.trim();
            if (normalized.isBlank()) {
                return;
            }
            notes.removeIf(existing -> normalized.equalsIgnoreCase(existing));
            notes.add(0, normalized);
            if (notes.size() > MAX_MEMORY_NOTES) {
                notes.subList(MAX_MEMORY_NOTES, notes.size()).clear();
            }
        }
    }

    private record VectorCandidate(
            Message message,
            String semanticText
    ) {
    }

    private record SemanticMatch(
            Message message,
            String text,
            double score
    ) {
    }

    private record StabilityTarget(String endpoint, String model) {
    }
}
