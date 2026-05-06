package iuh.fit.chat_service.services.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.chat_service.clients.GrpcUserServiceClient;
import iuh.fit.chat_service.config.AiAssistantProperties;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.entities.ParticipantInfo;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
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

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int DEFAULT_CONTEXT_MESSAGE_LIMIT = 12;
    private static final int SUMMARY_CONTEXT_MESSAGE_LIMIT = 90;
    private static final int MAX_MEMORY_NOTES = 20;
    private final ConcurrentMap<String, UserMemoryState> userMemoryByScope = new ConcurrentHashMap<>();

    @PostConstruct
    void logAiAssistantConfig() {
        log.info(
                "[ai-assistant] enabled={}, hasApiKey={}, textModel={}, imageProvider={}, imageModel={}, hasStabilityKey={}",
                properties.isEnabled(),
                StringUtils.hasText(properties.getApiKey()),
                safe(properties.getTextModel()),
                safe(properties.getImageProvider()),
                safe(properties.getImageModel()),
                StringUtils.hasText(properties.getStabilityApiKey())
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
                    ? "chua co"
                    : stats.firstMessageAt().format(DATE_TIME_FORMATTER);
            String lastAt = stats.lastMessageAt() == null
                    ? "chua co"
                    : stats.lastMessageAt().format(DATE_TIME_FORMATTER);

            String title = periodDays == null
                    ? "ThÃ¡Â»â€˜ng kÃƒÂª chat (toÃƒÂ n bÃ¡Â»â„¢ hÃ¡Â»â„¢i thoÃ¡ÂºÂ¡i hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i):"
                    : "ThÃ¡Â»â€˜ng kÃƒÂª chat (" + periodDays + " ngÃƒÂ y gÃ¡ÂºÂ§n nhÃ¡ÂºÂ¥t):";
            String answer = title + "\n"
                    + "- TÃ¡Â»â€¢ng tin nhÃ¡ÂºÂ¯n: " + totalMessages + "\n"
                    + "- BÃ¡ÂºÂ¡n Ã„â€˜ÃƒÂ£ gÃ¡Â»Â­i: " + requesterSentMessages + " tin (" + requesterPercent + "%)\n"
                    + (stats.groupConversation()
                    ? "- CÃƒÂ¡c thÃƒÂ nh viÃƒÂªn khÃƒÂ¡c Ã„â€˜ÃƒÂ£ gÃ¡Â»Â­i: " + othersSentMessages + " tin\n"
                    : "- " + resolveCounterpartDisplayName(stats.counterpartAccountId(), requesterId)
                    + " Ã„â€˜ÃƒÂ£ gÃ¡Â»Â­i: " + counterpartSentMessages + " tin\n")
                    + "- UniCall AI Ã„â€˜ÃƒÂ£ gÃ¡Â»Â­i: " + aiSentMessages + " tin\n"
                    + "- SÃ¡Â»â€˜ ngÃƒÂ y cÃƒÂ³ tin nhÃ¡ÂºÂ¯n: " + activeDays + " ngÃƒÂ y\n"
                    + "- Tin nhÃ¡ÂºÂ¯n Ã„â€˜Ã¡ÂºÂ§u tiÃƒÂªn: " + firstAt + "\n"
                    + "- Tin nhÃ¡ÂºÂ¯n gÃ¡ÂºÂ§n nhÃ¡ÂºÂ¥t: " + lastAt;

            if (stats.groupConversation()) {
                ChatStatisticsService.TopSenderStat topSender = stats.topSender();
                if (topSender == null) {
                    answer += "\n- Top ngÃ†Â°Ã¡Â»Âi gÃ¡Â»Â­i nhiÃ¡Â»Âu nhÃ¡ÂºÂ¥t: chÃ†Â°a cÃƒÂ³ dÃ¡Â»Â¯ liÃ¡Â»â€¡u";
                } else {
                    String senderLabel = topSender.accountId().equals(requesterId)
                            ? "BÃ¡ÂºÂ¡n"
                            : topSender.accountId();
                    answer += "\n- Top ngÃ†Â°Ã¡Â»Âi gÃ¡Â»Â­i nhiÃ¡Â»Âu nhÃ¡ÂºÂ¥t: " + senderLabel
                            + " (" + topSender.messageCount() + " tin)";
                }
            }

            return new AiAssistantReply(UNICALL_BOT_ID, answer, null);
        } catch (Exception ex) {
            log.warn("Chat statistics failed", ex);
            return new AiAssistantReply(
                    UNICALL_BOT_ID,
                    "KhÃƒÂ´ng lÃ¡ÂºÂ¥y Ã„â€˜Ã†Â°Ã¡Â»Â£c thÃ¡Â»â€˜ng kÃƒÂª chat lÃƒÂºc nÃƒÂ y. BÃ¡ÂºÂ¡n thÃ¡Â»Â­ lÃ¡ÂºÂ¡i sau nhÃƒÂ©.",
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
                answer = "MÃƒÂ¬nh chÃ†Â°a cÃƒÂ³ cÃƒÂ¢u trÃ¡ÂºÂ£ lÃ¡Â»Âi phÃƒÂ¹ hÃ¡Â»Â£p. BÃ¡ÂºÂ¡n thÃ¡Â»Â­ hÃ¡Â»Âi rÃƒÂµ hÃ†Â¡n nhÃƒÂ©.";
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
                    "Xin lÃ¡Â»â€”i, hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i UniCall AI Ã„â€˜ang bÃ¡ÂºÂ­n. BÃ¡ÂºÂ¡n thÃ¡Â»Â­ lÃ¡ÂºÂ¡i sau nhÃƒÂ©.",
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
                    "MÃƒÂ¬nh Ã„â€˜ÃƒÂ£ tÃ¡ÂºÂ¡o Ã¡ÂºÂ£nh theo yÃƒÂªu cÃ¡ÂºÂ§u cÃ¡Â»Â§a bÃ¡ÂºÂ¡n."
            );
            if (!StringUtils.hasText(imageDataUrl)) {
                return new AiAssistantReply(
                        UNICALL_IMAGE_BOT_ID,
                        "MÃƒÂ¬nh chÃ†Â°a tÃ¡ÂºÂ¡o Ã„â€˜Ã†Â°Ã¡Â»Â£c Ã¡ÂºÂ£nh lÃƒÂºc nÃƒÂ y. BÃ¡ÂºÂ¡n thÃ¡Â»Â­ lÃ¡ÂºÂ¡i vÃ¡Â»â€ºi prompt khÃƒÂ¡c nhÃƒÂ©.",
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
                    "Xin lÃ¡Â»â€”i, hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i UniCallImage Ã„â€˜ang bÃ¡ÂºÂ­n. BÃ¡ÂºÂ¡n thÃ¡Â»Â­ lÃ¡ÂºÂ¡i sau nhÃƒÂ©.",
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
                        "MÃƒÂ¬nh chÃ†Â°a tÃ¡ÂºÂ¡o Ã„â€˜Ã†Â°Ã¡Â»Â£c Ã¡ÂºÂ£nh lÃƒÂºc nÃƒÂ y. BÃ¡ÂºÂ¡n thÃ¡Â»Â­ lÃ¡ÂºÂ¡i vÃ¡Â»â€ºi prompt khÃƒÂ¡c nhÃƒÂ©.",
                        null
                );
            }
            return new AiAssistantReply(
                    UNICALL_IMAGE_BOT_ID,
                    "MÃƒÂ¬nh Ã„â€˜ÃƒÂ£ tÃ¡ÂºÂ¡o Ã¡ÂºÂ£nh theo yÃƒÂªu cÃ¡ÂºÂ§u cÃ¡Â»Â§a bÃ¡ÂºÂ¡n.",
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
                    "Xin lÃ¡Â»â€”i, hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i UniCallImage Ã„â€˜ang bÃ¡ÂºÂ­n. BÃ¡ÂºÂ¡n thÃ¡Â»Â­ lÃ¡ÂºÂ¡i sau nhÃƒÂ©.",
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
                return "(khong co du lieu)";
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
            return output.isBlank() ? "(khong co du lieu)" : output;
        } catch (Exception ex) {
            log.debug("Cannot build conversation meta context: {}", ex.getMessage());
            return "(khong co du lieu)";
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
                return "(khong co du lieu)";
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
                        text = "[tin nhan dinh kem tep]";
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
            return output.isBlank() ? "(khong co du lieu)" : output;
        } catch (Exception ex) {
            log.debug("Cannot build recent conversation context: {}", ex.getMessage());
            return "(khong co du lieu)";
        }
    }

    private String resolveSenderLabel(String senderId, String requesterId) {
        if (!StringUtils.hasText(senderId)) {
            return "Nguoi dung";
        }
        if (requesterId.equals(senderId)) {
            return "Ban";
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
            return "Ã„ÂÃ¡Â»â€˜i phÃ†Â°Ã†Â¡ng";
        }
        if (counterpartId.equals(requesterId)) {
            return "BÃ¡ÂºÂ¡n";
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
                prompt = "Tao mot hinh anh theo chu de ngau nhien, phong cach hien dai.";
            }
            return new MentionCommand(MentionType.IMAGE, prompt);
        }

        if (lowered.startsWith(UNICALL_MENTION)) {
            String prompt = trimmed.substring(UNICALL_MENTION.length()).trim();
            if (!StringUtils.hasText(prompt)) {
                prompt = "Chao UniCall, hay gioi thieu ngan gon ban co the giup gi.";
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
            reason = "AI_ASSISTANT_ENABLED=false va thieu AI_ASSISTANT_API_KEY";
        } else if (!enabled) {
            reason = "AI_ASSISTANT_ENABLED=false";
        } else {
            reason = "thieu AI_ASSISTANT_API_KEY";
        }

        if (command.type == MentionType.IMAGE) {
            return new AiAssistantReply(
                    UNICALL_IMAGE_BOT_ID,
                    "UniCallImage chua san sang (" + reason + ").",
                    null
            );
        }
        return new AiAssistantReply(
                UNICALL_BOT_ID,
                "UniCall AI chua san sang (" + reason + ").",
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
            return "UniCallImage da het goi mien phi Gemini API. Hay cho lam moi luot hoac doi key/project co goi phu hop.";
        }
        if (status == 404 || loweredBody.contains("not found")) {
            return "Model anh Gemini khong ton tai hoac khong ho tro endpoint hien tai. Kiem tra AI_ASSISTANT_IMAGE_MODEL.";
        }
        if (status == 400 && loweredBody.contains("does not support") && loweredBody.contains("image")) {
            return "Model hien tai khong ho tro tra anh. Hay doi sang model ho tro image generation.";
        }
        if (status == 403 || loweredBody.contains("permission") || loweredBody.contains("billing")) {
            return "Key Gemini chua co quyen tao anh hoac chua bat billing cho project.";
        }
        return "UniCallImage tam thoi loi khi goi Gemini. Ban thu lai sau nhe.";
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
            return "Stability API key khÃƒÂ´ng hÃ¡Â»Â£p lÃ¡Â»â€¡. HÃƒÂ£y kiÃ¡Â»Æ’m tra STABILITY_API_KEY.";
        }
        if (status == 402 || loweredBody.contains("credit") || loweredBody.contains("insufficient")) {
            return "TÃƒÂ i khoÃ¡ÂºÂ£n Stability khÃƒÂ´ng Ã„â€˜Ã¡Â»Â§ credit Ã„â€˜Ã¡Â»Æ’ tÃ¡ÂºÂ¡o Ã¡ÂºÂ£nh.";
        }
        if (status == 403) {
            return "TÃƒÂ i khoÃ¡ÂºÂ£n Stability chÃ†Â°a cÃƒÂ³ quyÃ¡Â»Ân gÃ¡Â»Âi model Ã¡ÂºÂ£nh hiÃ¡Â»â€¡n tÃ¡ÂºÂ¡i.";
        }
        if (status == 429 || loweredBody.contains("rate")) {
            return "Stability Ã„â€˜ang giÃ¡Â»â€ºi hÃ¡ÂºÂ¡n tÃ¡Â»â€˜c Ã„â€˜Ã¡Â»â„¢. BÃ¡ÂºÂ¡n thÃ¡Â»Â­ lÃ¡ÂºÂ¡i sau vÃƒÂ i giÃƒÂ¢y.";
        }
        if (status == 400 || status == 422) {
            return "Prompt hoÃ¡ÂºÂ·c tham sÃ¡Â»â€˜ tÃ¡ÂºÂ¡o Ã¡ÂºÂ£nh chÃ†Â°a hÃ¡Â»Â£p lÃ¡Â»â€¡.";
        }
        return "UniCallImage tÃ¡ÂºÂ¡m thÃ¡Â»Âi lÃ¡Â»â€”i khi gÃ¡Â»Âi Stability. BÃ¡ÂºÂ¡n thÃ¡Â»Â­ lÃ¡ÂºÂ¡i sau nhÃƒÂ©.";
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
            return "API key Gemini khong hop le. Hay kiem tra lai AI_ASSISTANT_API_KEY.";
        }
        if (status == 403 || loweredBody.contains("permission") || loweredBody.contains("billing")) {
            return "Key Gemini chua co quyen truy cap model text hoac project chua bat billing.";
        }
        if (status == 429 || loweredBody.contains("quota") || loweredBody.contains("resource_exhausted")) {
            return "UniCall AI da het quota Gemini API. Hay cho lam moi luot hoac doi project/key.";
        }
        if (status == 404 || loweredBody.contains("not found")) {
            return "Model text Gemini khong ton tai. Kiem tra AI_ASSISTANT_TEXT_MODEL.";
        }
        if (status == 400 || loweredBody.contains("invalid_argument")) {
            return "Yeu cau goi Gemini khong hop le. Kiem tra cau hinh model va payload.";
        }
        return "UniCall AI tam thoi loi khi goi Gemini. Ban thu lai sau nhe.";
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

    private record StabilityTarget(String endpoint, String model) {
    }
}


