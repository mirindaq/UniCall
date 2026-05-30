package iuh.fit.chat_service.services.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.chat_service.config.AiAssistantProperties;
import iuh.fit.chat_service.dtos.request.AskAiAssistantThreadRequest;
import iuh.fit.chat_service.dtos.request.CreateAiAssistantThreadRequest;
import iuh.fit.chat_service.dtos.response.AiAssistantThreadDetailResponse;
import iuh.fit.chat_service.dtos.response.AiAssistantThreadSummaryResponse;
import iuh.fit.chat_service.dtos.response.AiAssistantTurnResponse;
import iuh.fit.chat_service.entities.AiAssistantThread;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.AiThreadRole;
import iuh.fit.chat_service.enums.AiThreadScope;
import iuh.fit.chat_service.repositories.AiAssistantThreadRepository;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.chat_service.services.AiWorkspaceService;
import iuh.fit.chat_service.services.MessageVectorSearchService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
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
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiWorkspaceServiceImpl implements AiWorkspaceService {
    private static final int MAX_QUERY_LENGTH = 4000;
    private static final int MAX_THREAD_TURNS = 60;
    private static final int MAX_HISTORY_TURNS_FOR_PROMPT = 12;
    private static final int MAX_CONTEXT_SNIPPET_LENGTH = 320;
    private static final int DEFAULT_CONTEXT_LIMIT = 8;
    private static final int MAX_CONTEXT_LIMIT = 16;
    private static final Pattern WHITESPACE_REGEX = Pattern.compile("\\s+");

    private final AiAssistantThreadRepository threadRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MessageVectorSearchService messageVectorSearchService;
    private final AiAssistantProperties aiAssistantProperties;
    private final ObjectMapper objectMapper;

    @Override
    public AiAssistantThreadSummaryResponse createThread(String identityUserId, CreateAiAssistantThreadRequest request) {
        requireIdentityUserId(identityUserId);

        String requestedConversationId = request == null ? null : normalize(request.getConversationId());
        if (StringUtils.hasText(requestedConversationId)) {
            requireParticipant(requestedConversationId, identityUserId);
        }

        String title = request == null ? null : normalize(request.getTitle());
        if (!StringUtils.hasText(title)) {
            title = "Trợ lý AI " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM HH:mm"));
        }

        LocalDateTime now = LocalDateTime.now();
        AiAssistantThread thread = new AiAssistantThread();
        thread.setIdThread(UUID.randomUUID().toString());
        thread.setOwnerIdentityUserId(identityUserId);
        thread.setTitle(title);
        thread.setDefaultConversationId(requestedConversationId);
        thread.setCreatedAt(now);
        thread.setUpdatedAt(now);
        thread.setTurns(new ArrayList<>());
        return AiAssistantThreadSummaryResponse.from(threadRepository.save(thread));
    }

    @Override
    public List<AiAssistantThreadSummaryResponse> listThreads(String identityUserId) {
        requireIdentityUserId(identityUserId);
        return threadRepository.findByOwnerIdentityUserId(identityUserId).stream()
                .map(AiAssistantThreadSummaryResponse::from)
                .filter(item -> item != null)
                .collect(Collectors.toList());
    }

    @Override
    public AiAssistantThreadDetailResponse getThreadDetail(String identityUserId, String threadId) {
        requireIdentityUserId(identityUserId);
        AiAssistantThread thread = requireOwnedThread(threadId, identityUserId);
        return AiAssistantThreadDetailResponse.from(thread);
    }

    @Override
    public AiAssistantTurnResponse askThread(
            String identityUserId,
            String threadId,
            AskAiAssistantThreadRequest request
    ) {
        requireIdentityUserId(identityUserId);
        AiAssistantThread thread = requireOwnedThread(threadId, identityUserId);
        if (request == null || !StringUtils.hasText(request.getQuery())) {
            throw new InvalidParamException("query không được để trống");
        }

        String query = normalize(request.getQuery());
        if (query.length() > MAX_QUERY_LENGTH) {
            query = query.substring(0, MAX_QUERY_LENGTH).trim();
        }
        int contextLimit = normalizeContextLimit(request.getLimit());
        List<String> scopedConversationIds = resolveScopedConversationIds(identityUserId, thread, request);
        List<AiAssistantThread.Citation> citations = resolveCitations(
                identityUserId,
                scopedConversationIds,
                query,
                contextLimit
        );

        String answer = generateAnswer(thread, query, scopedConversationIds, citations);

        LocalDateTime now = LocalDateTime.now();
        List<AiAssistantThread.Turn> turns = thread.getTurns() == null
                ? new ArrayList<>()
                : new ArrayList<>(thread.getTurns());

        AiAssistantThread.Turn userTurn = new AiAssistantThread.Turn(
                UUID.randomUUID().toString(),
                AiThreadRole.USER,
                query,
                now,
                List.of()
        );
        AiAssistantThread.Turn assistantTurn = new AiAssistantThread.Turn(
                UUID.randomUUID().toString(),
                AiThreadRole.ASSISTANT,
                answer,
                LocalDateTime.now(),
                citations
        );
        turns.add(userTurn);
        turns.add(assistantTurn);
        if (turns.size() > MAX_THREAD_TURNS) {
            turns = new ArrayList<>(turns.subList(Math.max(0, turns.size() - MAX_THREAD_TURNS), turns.size()));
        }

        thread.setTurns(turns);
        thread.setUpdatedAt(LocalDateTime.now());
        threadRepository.save(thread);
        return AiAssistantTurnResponse.from(assistantTurn);
    }

    private List<String> resolveScopedConversationIds(
            String identityUserId,
            AiAssistantThread thread,
            AskAiAssistantThreadRequest request
    ) {
        AiThreadScope scope = AiThreadScope.fromNullable(request.getScope());
        return switch (scope) {
            case CURRENT_CONVERSATION -> {
                String conversationId = firstNonBlank(
                        normalize(request.getConversationId()),
                        normalize(thread.getDefaultConversationId())
                );
                if (!StringUtils.hasText(conversationId)) {
                    throw new InvalidParamException("Thiếu conversationId cho CURRENT_CONVERSATION");
                }
                requireParticipant(conversationId, identityUserId);
                yield List.of(conversationId);
            }
            case SELECTED_CONVERSATIONS -> {
                List<String> requestedIds = request.getConversationIds() == null
                        ? List.of()
                        : request.getConversationIds();
                LinkedHashSet<String> unique = new LinkedHashSet<>();
                for (String rawId : requestedIds) {
                    String normalized = normalize(rawId);
                    if (!StringUtils.hasText(normalized)) {
                        continue;
                    }
                    requireParticipant(normalized, identityUserId);
                    unique.add(normalized);
                }
                if (unique.isEmpty()) {
                    throw new InvalidParamException("conversationIds không được để trống cho SELECTED_CONVERSATIONS");
                }
                yield new ArrayList<>(unique);
            }
            case MY_ALL_CONVERSATIONS -> {
                List<String> allConversationIds = conversationRepository.findByParticipantAccount(identityUserId).stream()
                        .map(Conversation::getIdConversation)
                        .filter(StringUtils::hasText)
                        .distinct()
                        .collect(Collectors.toList());
                if (allConversationIds.isEmpty()) {
                    throw new InvalidParamException("Bạn chưa có hội thoại nào");
                }
                yield allConversationIds;
            }
        };
    }

    private List<AiAssistantThread.Citation> resolveCitations(
            String identityUserId,
            List<String> conversationIds,
            String query,
            int limit
    ) {
        if (conversationIds == null || conversationIds.isEmpty() || !StringUtils.hasText(query)) {
            return List.of();
        }

        List<CandidateHit> hits = new ArrayList<>();
        int perConversationLimit = Math.min(Math.max(3, limit), 8);

        for (String conversationId : conversationIds) {
            List<MessageVectorSearchService.ScoredPoint> scoredPoints = messageVectorSearchService.search(
                    conversationId,
                    query,
                    perConversationLimit
            );
            for (MessageVectorSearchService.ScoredPoint point : scoredPoints) {
                if (point == null || !StringUtils.hasText(point.messageId())) {
                    continue;
                }
                hits.add(new CandidateHit(conversationId, point.messageId().trim(), point.score()));
            }
        }

        if (hits.isEmpty()) {
            String regexKeyword = Pattern.quote(query.trim());
            for (String conversationId : conversationIds) {
                List<Message> fallbackMessages = messageRepository.searchVisibleForParticipant(
                        conversationId,
                        identityUserId,
                        regexKeyword,
                        PageRequest.of(0, Math.min(3, limit), Sort.by(Sort.Direction.DESC, "timeSent"))
                ).getContent();
                for (Message message : fallbackMessages) {
                    if (message == null || !StringUtils.hasText(message.getIdMessage())) {
                        continue;
                    }
                    hits.add(new CandidateHit(conversationId, message.getIdMessage(), 0d));
                }
            }
        }

        if (hits.isEmpty()) {
            return List.of();
        }

        Map<String, CandidateHit> bestHitByMessageId = new LinkedHashMap<>();
        for (CandidateHit hit : hits) {
            CandidateHit current = bestHitByMessageId.get(hit.messageId());
            if (current == null || hit.score() > current.score()) {
                bestHitByMessageId.put(hit.messageId(), hit);
            }
        }
        List<CandidateHit> uniqueHits = new ArrayList<>(bestHitByMessageId.values());
        uniqueHits.sort(Comparator.comparingDouble(CandidateHit::score).reversed());
        if (uniqueHits.size() > limit * 3) {
            uniqueHits = new ArrayList<>(uniqueHits.subList(0, limit * 3));
        }

        Map<String, List<String>> messageIdsByConversation = new LinkedHashMap<>();
        for (CandidateHit hit : uniqueHits) {
            messageIdsByConversation.computeIfAbsent(hit.conversationId(), ignored -> new ArrayList<>())
                    .add(hit.messageId());
        }

        Map<String, Message> messageById = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> entry : messageIdsByConversation.entrySet()) {
            List<Message> visibleMessages = messageRepository.findVisibleByIdsForParticipant(
                    entry.getValue(),
                    entry.getKey(),
                    identityUserId
            );
            for (Message message : visibleMessages) {
                if (message == null || !StringUtils.hasText(message.getIdMessage())) {
                    continue;
                }
                messageById.put(message.getIdMessage(), message);
            }
        }

        List<AiAssistantThread.Citation> citations = new ArrayList<>();
        for (CandidateHit hit : uniqueHits) {
            if (citations.size() >= limit) {
                break;
            }
            Message message = messageById.get(hit.messageId());
            if (message == null) {
                continue;
            }

            String snippet = shortenSnippet(message.getContent());
            if (!StringUtils.hasText(snippet)) {
                continue;
            }

            citations.add(new AiAssistantThread.Citation(
                    message.getIdMessage(),
                    message.getIdConversation(),
                    message.getIdAccountSent(),
                    message.getTimeSent(),
                    snippet,
                    hit.score()
            ));
        }
        return citations;
    }

    private String generateAnswer(
            AiAssistantThread thread,
            String query,
            List<String> scopedConversationIds,
            List<AiAssistantThread.Citation> citations
    ) {
        boolean enabled = aiAssistantProperties.isEnabled();
        boolean hasApiKey = StringUtils.hasText(aiAssistantProperties.getApiKey());
        if (!enabled || !hasApiKey) {
            if (!enabled && !hasApiKey) {
                return "Trợ lý AI chưa sẵn sàng (AI_ASSISTANT_ENABLED=false và thiếu AI_ASSISTANT_API_KEY).";
            }
            if (!enabled) {
                return "Trợ lý AI chưa sẵn sàng (AI_ASSISTANT_ENABLED=false).";
            }
            return "Trợ lý AI chưa sẵn sàng (thiếu AI_ASSISTANT_API_KEY).";
        }

        try {
            JsonNode response = callGeminiGenerateContent(
                    aiAssistantProperties.getTextModel(),
                    buildGeminiContents(thread, query, scopedConversationIds, citations),
                    buildSystemPrompt(),
                    false
            );
            String answer = extractTextFromGemini(response);
            if (!StringUtils.hasText(answer)) {
                return "Mình chưa có câu trả lời phù hợp. Bạn thử hỏi rõ hơn nhé.";
            }
            return answer.trim();
        } catch (Exception ex) {
            log.warn("AI workspace answer failed: {}", ex.getMessage());
            return "Xin lỗi, trợ lý AI đang bận. Bạn thử lại sau nhé.";
        }
    }

    private List<Map<String, Object>> buildGeminiContents(
            AiAssistantThread thread,
            String query,
            List<String> scopedConversationIds,
            List<AiAssistantThread.Citation> citations
    ) {
        List<Map<String, Object>> contents = new ArrayList<>();
        List<AiAssistantThread.Turn> history = thread.getTurns() == null
                ? List.of()
                : thread.getTurns();
        if (!history.isEmpty()) {
            int start = Math.max(0, history.size() - MAX_HISTORY_TURNS_FOR_PROMPT);
            List<AiAssistantThread.Turn> recentTurns = history.subList(start, history.size());
            for (AiAssistantThread.Turn turn : recentTurns) {
                if (turn == null || !StringUtils.hasText(turn.getContent()) || turn.getRole() == null) {
                    continue;
                }
                String role = turn.getRole() == AiThreadRole.ASSISTANT ? "model" : "user";
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", turn.getContent().trim()))
                ));
            }
        }

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append("Yêu cầu người dùng:\n").append(query.trim()).append("\n\n");
        promptBuilder.append("Scope hội thoại:\n");
        if (scopedConversationIds == null || scopedConversationIds.isEmpty()) {
            promptBuilder.append("- Không xác định\n");
        } else {
            for (String conversationId : scopedConversationIds) {
                promptBuilder.append("- ").append(conversationId).append("\n");
            }
        }

        if (citations != null && !citations.isEmpty()) {
            promptBuilder.append("\nNgữ cảnh liên quan từ chat:\n");
            int index = 1;
            for (AiAssistantThread.Citation citation : citations) {
                String snippet = citation == null ? null : citation.getSnippet();
                if (!StringUtils.hasText(snippet)) {
                    continue;
                }
                promptBuilder.append(index++)
                        .append(". [conversationId=")
                        .append(firstNonBlank(citation.getConversationId(), ""))
                        .append(", messageId=")
                        .append(firstNonBlank(citation.getMessageId(), ""))
                        .append(", score=")
                        .append(String.format(Locale.US, "%.4f", citation.getScore()))
                        .append("] ")
                        .append(snippet.trim())
                        .append("\n");
            }
        } else {
            promptBuilder.append("\nKhông tìm thấy ngữ cảnh phù hợp trong scope.\n");
        }

        promptBuilder.append(
                "\nHãy trả lời ngắn gọn, đúng trọng tâm, không bịa thông tin. " +
                "Nếu thiếu dữ liệu thì nói rõ cần thêm thông tin nào."
        );

        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", promptBuilder.toString()))
        ));
        return contents;
    }

    private String buildSystemPrompt() {
        String configured = normalize(aiAssistantProperties.getTextSystemPrompt());
        if (!StringUtils.hasText(configured)) {
            configured = "Bạn là trợ lý AI cho UniCall, trả lời hữu ích, lịch sự bằng tiếng Việt.";
        }
        return configured + " Khi câu hỏi liên quan lịch sử chat, ưu tiên dựa trên ngữ cảnh đã cung cấp.";
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

        String endpoint = aiAssistantProperties.getBaseUrl().trim()
                + "/models/" + model.trim()
                + ":generateContent?key=" + aiAssistantProperties.getApiKey().trim();

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.max(1000, aiAssistantProperties.getConnectTimeoutMs()));
        requestFactory.setReadTimeout(Math.max(1000, aiAssistantProperties.getReadTimeoutMs()));
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
                JsonNode textNode = part.get("text");
                if (textNode == null || textNode.isNull()) {
                    continue;
                }
                String text = textNode.asText("");
                if (StringUtils.hasText(text)) {
                    return text.trim();
                }
            }
        }
        return null;
    }

    private Conversation requireParticipant(String conversationId, String identityUserId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hội thoại"));
        List<ParticipantInfo> participantInfos = conversation.getParticipantInfos();
        if (participantInfos == null || participantInfos.isEmpty()) {
            throw new InvalidParamException("Hội thoại không có thành viên");
        }
        boolean isParticipant = participantInfos.stream()
                .anyMatch(participant -> participant != null
                        && identityUserId.equals(participant.getIdAccount()));
        if (!isParticipant) {
            throw new InvalidParamException("Bạn không thuộc cuộc hội thoại này");
        }
        return conversation;
    }

    private AiAssistantThread requireOwnedThread(String threadId, String identityUserId) {
        String normalizedThreadId = normalize(threadId);
        if (!StringUtils.hasText(normalizedThreadId)) {
            throw new InvalidParamException("threadId không hợp lệ");
        }
        return threadRepository.findByIdThreadAndOwnerIdentityUserId(normalizedThreadId, identityUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy AI thread"));
    }

    private int normalizeContextLimit(Integer rawLimit) {
        int limit = rawLimit == null ? DEFAULT_CONTEXT_LIMIT : rawLimit;
        if (limit < 1) {
            return DEFAULT_CONTEXT_LIMIT;
        }
        return Math.min(limit, MAX_CONTEXT_LIMIT);
    }

    private static String shortenSnippet(String content) {
        String normalized = normalize(content);
        if (!StringUtils.hasText(normalized)) {
            return "";
        }
        normalized = WHITESPACE_REGEX.matcher(normalized).replaceAll(" ").trim();
        if (normalized.length() <= MAX_CONTEXT_SNIPPET_LENGTH) {
            return normalized;
        }
        return normalized.substring(0, MAX_CONTEXT_SNIPPET_LENGTH).trim() + "...";
    }

    private static String normalize(String value) {
        return value == null ? null : value.trim();
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

    private static void requireIdentityUserId(String identityUserId) {
        if (!StringUtils.hasText(identityUserId)) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
    }

    private record CandidateHit(String conversationId, String messageId, double score) {
    }
}
