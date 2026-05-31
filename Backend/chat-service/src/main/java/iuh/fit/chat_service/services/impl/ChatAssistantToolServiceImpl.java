package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.clients.GrpcUserServiceClient;
import iuh.fit.chat_service.dtos.response.ConversationResponse;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.ChatAssistantScope;
import iuh.fit.chat_service.services.ChatAssistantToolService;
import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.chat_service.services.ChatMessageService;
import iuh.fit.chat_service.services.ConversationMessageVectorService;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.exceptions.InvalidParamException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatAssistantToolServiceImpl implements ChatAssistantToolService {

    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final ChatConversationService chatConversationService;
    private final ChatMessageService chatMessageService;
    private final ConversationMessageVectorService conversationMessageVectorService;
    private final GrpcUserServiceClient grpcUserServiceClient;

    @Override
    public List<ConversationToolItem> listMyConversations(String requesterId, Integer limit) {
        List<ConversationResponse> conversations = chatConversationService.listMyConversations(requireRequester(requesterId));
        int resolvedLimit = resolveLimit(limit, DEFAULT_LIMIT);
        if (conversations.isEmpty()) {
            return List.of();
        }
        Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache = new HashMap<>();
        return conversations.stream()
                .limit(resolvedLimit)
                .map(conversation -> toConversationToolItem(conversation, userDisplayCache))
                .toList();
    }

    @Override
    public MessageToolPage getConversationMessages(
            String requesterId,
            String conversationId,
            Integer page,
            Integer limit
    ) {
        chatConversationService.requireParticipant(conversationId, requireRequester(requesterId));
        PageResponse<MessageResponse> response = chatMessageService.listMessages(
                requesterId,
                conversationId,
                resolvePage(page),
                resolveLimit(limit, DEFAULT_LIMIT)
        );
        return toMessageToolPage(response);
    }

    @Override
    public MessageToolPage searchMessagesByKeyword(
            String requesterId,
            String conversationId,
            String keyword,
            Integer page,
            Integer limit
    ) {
        if (!StringUtils.hasText(keyword)) {
            throw new InvalidParamException("Từ khóa tìm kiếm không hợp lệ");
        }
        chatConversationService.requireParticipant(conversationId, requireRequester(requesterId));
        PageResponse<MessageResponse> response = chatMessageService.searchMessages(
                requesterId,
                conversationId,
                keyword.trim(),
                resolvePage(page),
                resolveLimit(limit, DEFAULT_LIMIT)
        );
        return toMessageToolPage(response);
    }

    @Override
    public List<SemanticMessageHit> semanticSearchConversation(
            String requesterId,
            String conversationId,
            String query,
            Integer limit
    ) {
        if (!StringUtils.hasText(query)) {
            throw new InvalidParamException("Nội dung truy vấn không hợp lệ");
        }
        String identityUserId = requireRequester(requesterId);
        chatConversationService.requireParticipant(conversationId, identityUserId);

        ConversationToolItem conversationMeta = listMyConversations(identityUserId, MAX_LIMIT).stream()
                .filter(item -> conversationId.equals(item.conversationId()))
                .findFirst()
                .orElse(null);

        Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache = new HashMap<>();
        return conversationMessageVectorService.searchConversation(
                        conversationId,
                        identityUserId,
                        query.trim(),
                        resolveLimit(limit, DEFAULT_LIMIT)
                ).stream()
                .map(hit -> toSemanticHit(hit, conversationMeta, userDisplayCache))
                .toList();
    }

    @Override
    public List<SemanticMessageHit> semanticSearchMyChatSpace(
            String requesterId,
            String query,
            Integer limit,
            String participantId
    ) {
        if (!StringUtils.hasText(query)) {
            throw new InvalidParamException("Nội dung truy vấn không hợp lệ");
        }
        String identityUserId = requireRequester(requesterId);
        int resolvedLimit = resolveLimit(limit, DEFAULT_LIMIT);
        List<ConversationToolItem> conversations = listMyConversations(identityUserId, MAX_LIMIT);
        if (conversations.isEmpty()) {
            return List.of();
        }

        int perConversationLimit = Math.max(1, Math.min(8, resolvedLimit));
        Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache = new HashMap<>();
        List<SemanticMessageHit> merged = new ArrayList<>();

        for (ConversationToolItem conversation : conversations) {
            List<ConversationMessageVectorService.MemoryHit> hits = conversationMessageVectorService.searchConversation(
                    conversation.conversationId(),
                    identityUserId,
                    query.trim(),
                    perConversationLimit
            );
            for (ConversationMessageVectorService.MemoryHit hit : hits) {
                if (StringUtils.hasText(participantId) && !participantId.trim().equals(hit.senderId())) {
                    continue;
                }
                merged.add(toSemanticHit(hit, conversation, userDisplayCache));
            }
        }

        return merged.stream()
                .sorted(Comparator
                        .comparingDouble(SemanticMessageHit::score).reversed()
                        .thenComparing(SemanticMessageHit::timeSent, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(resolvedLimit)
                .toList();
    }

    @Override
    public Optional<WhoSaidToolResult> findWhoSaid(
            String requesterId,
            String query,
            String conversationId,
            String participantId,
            Integer limit
    ) {
        if (!StringUtils.hasText(query)) {
            return Optional.empty();
        }

        String identityUserId = requireRequester(requesterId);
        int resolvedLimit = resolveLimit(limit, 8);
        List<SemanticMessageHit> semanticHits;
        ChatAssistantScope scope;

        if (StringUtils.hasText(conversationId)) {
            scope = ChatAssistantScope.CURRENT_CONVERSATION;
            semanticHits = semanticSearchConversation(identityUserId, conversationId.trim(), query.trim(), resolvedLimit);
        } else {
            scope = ChatAssistantScope.MY_CHAT_SPACE;
            semanticHits = semanticSearchMyChatSpace(identityUserId, query.trim(), resolvedLimit, participantId);
        }

        List<SemanticMessageHit> filteredHits = semanticHits.stream()
                .filter(hit -> !StringUtils.hasText(participantId) || participantId.trim().equals(hit.senderId()))
                .toList();
        if (!filteredHits.isEmpty()) {
            SemanticMessageHit top = filteredHits.getFirst();
            Map<String, Object> evidence = new LinkedHashMap<>();
            evidence.put("strategy", "semantic");
            evidence.put("candidateCount", filteredHits.size());
            evidence.put("topScore", top.score());
            return Optional.of(new WhoSaidToolResult(
                    top.messageId(),
                    top.conversationId(),
                    top.conversationName(),
                    top.conversationType(),
                    top.senderId(),
                    top.senderName(),
                    top.text(),
                    top.timeSent(),
                    top.score(),
                    scope,
                    evidence
            ));
        }

        if (!StringUtils.hasText(conversationId)) {
            return Optional.empty();
        }

        MessageToolPage keywordPage = searchMessagesByKeyword(
                identityUserId,
                conversationId.trim(),
                query.trim(),
                DEFAULT_PAGE,
                Math.min(10, resolvedLimit)
        );
        if (keywordPage.items().isEmpty()) {
            return Optional.empty();
        }

        MessageToolItem first = keywordPage.items().getFirst();
        Map<String, Object> evidence = new LinkedHashMap<>();
        evidence.put("strategy", "keyword");
        evidence.put("candidateCount", keywordPage.items().size());
        return Optional.of(new WhoSaidToolResult(
                first.messageId(),
                first.conversationId(),
                findConversationName(identityUserId, first.conversationId()),
                null,
                first.senderId(),
                first.senderName(),
                first.content(),
                first.timeSent(),
                0.0D,
                ChatAssistantScope.CURRENT_CONVERSATION,
                evidence
        ));
    }

    private MessageToolPage toMessageToolPage(PageResponse<MessageResponse> response) {
        if (response == null) {
            return new MessageToolPage(List.of(), DEFAULT_PAGE, 0, DEFAULT_LIMIT, 0);
        }

        Set<String> senderIds = response.getItems() == null
                ? Set.of()
                : response.getItems().stream()
                .map(MessageResponse::getIdAccountSent)
                .filter(StringUtils::hasText)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache = loadDisplayCache(senderIds);

        List<MessageToolItem> items = response.getItems() == null
                ? List.of()
                : response.getItems().stream().map(message -> toMessageToolItem(message, userDisplayCache)).toList();

        return new MessageToolPage(
                items,
                response.getPage(),
                response.getTotalPage(),
                response.getLimit(),
                response.getTotalItem()
        );
    }

    private ConversationToolItem toConversationToolItem(
            ConversationResponse conversation,
            Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache
    ) {
        List<ConversationMember> members = resolveConversationMembers(
                conversation == null ? null : conversation.getParticipantInfos(),
                userDisplayCache
        );
        String senderName = resolveDisplayName(conversation == null ? null : conversation.getLastMessageSenderId(), userDisplayCache);
        return new ConversationToolItem(
                conversation == null ? null : conversation.getIdConversation(),
                conversation == null ? null : conversation.getType(),
                conversation == null ? null : conversation.getName(),
                conversation == null ? null : conversation.getAvatar(),
                conversation == null ? null : conversation.getLastMessageContent(),
                conversation == null ? null : conversation.getLastMessageSenderId(),
                senderName,
                conversation == null ? null : conversation.getDateUpdateMessage(),
                conversation == null ? 0 : conversation.getUnreadCount(),
                conversation == null ? 0 : conversation.getNumberMember(),
                members
        );
    }

    private MessageToolItem toMessageToolItem(
            MessageResponse message,
            Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache
    ) {
        if (message == null) {
            return null;
        }
        return new MessageToolItem(
                message.getIdMessage(),
                message.getIdConversation(),
                message.getIdAccountSent(),
                resolveDisplayName(message.getIdAccountSent(), userDisplayCache),
                message.getType(),
                message.getContent(),
                message.getTimeSent(),
                message.isRecalled(),
                message.isEdited(),
                message.getAttachments() == null ? List.of() : message.getAttachments()
        );
    }

    private SemanticMessageHit toSemanticHit(
            ConversationMessageVectorService.MemoryHit hit,
            ConversationToolItem conversation,
            Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache
    ) {
        return new SemanticMessageHit(
                hit.messageId(),
                hit.conversationId(),
                conversation == null ? null : conversation.name(),
                conversation == null ? null : conversation.type(),
                hit.senderId(),
                resolveDisplayName(hit.senderId(), userDisplayCache),
                hit.text(),
                hit.timeSent(),
                hit.score()
        );
    }

    private List<ConversationMember> resolveConversationMembers(
            List<ParticipantInfo> participants,
            Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache
    ) {
        if (participants == null || participants.isEmpty()) {
            return List.of();
        }
        List<ConversationMember> members = new ArrayList<>();
        for (ParticipantInfo participant : participants) {
            if (participant == null || !StringUtils.hasText(participant.getIdAccount())) {
                continue;
            }
            String userId = participant.getIdAccount().trim();
            String displayName = StringUtils.hasText(participant.getNickname())
                    ? participant.getNickname().trim()
                    : resolveDisplayName(userId, userDisplayCache);
            String avatar = resolveAvatar(userId, userDisplayCache);
            members.add(new ConversationMember(userId, displayName, avatar));
        }
        return members;
    }

    private Map<String, GrpcUserServiceClient.UserDisplayInfo> loadDisplayCache(Set<String> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return new HashMap<>();
        }
        Map<String, GrpcUserServiceClient.UserDisplayInfo> cache = new HashMap<>();
        for (String userId : userIds) {
            if (!StringUtils.hasText(userId)) {
                continue;
            }
            grpcUserServiceClient.getUserDisplayInfo(userId.trim())
                    .ifPresent(info -> cache.put(userId.trim(), info));
        }
        return cache;
    }

    private String resolveDisplayName(
            String userId,
            Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache
    ) {
        if (!StringUtils.hasText(userId)) {
            return null;
        }
        String normalizedUserId = userId.trim();
        GrpcUserServiceClient.UserDisplayInfo existing = userDisplayCache.get(normalizedUserId);
        if (existing != null && StringUtils.hasText(existing.displayName())) {
            return existing.displayName();
        }
        GrpcUserServiceClient.UserDisplayInfo loaded = grpcUserServiceClient.getUserDisplayInfo(normalizedUserId)
                .orElse(new GrpcUserServiceClient.UserDisplayInfo(normalizedUserId, null));
        userDisplayCache.put(normalizedUserId, loaded);
        return loaded.displayName();
    }

    private String resolveAvatar(
            String userId,
            Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache
    ) {
        if (!StringUtils.hasText(userId)) {
            return null;
        }
        String normalizedUserId = userId.trim();
        GrpcUserServiceClient.UserDisplayInfo existing = userDisplayCache.get(normalizedUserId);
        if (existing != null) {
            return existing.avatar();
        }
        GrpcUserServiceClient.UserDisplayInfo loaded = grpcUserServiceClient.getUserDisplayInfo(normalizedUserId)
                .orElse(new GrpcUserServiceClient.UserDisplayInfo(normalizedUserId, null));
        userDisplayCache.put(normalizedUserId, loaded);
        return loaded.avatar();
    }

    private String findConversationName(String requesterId, String conversationId) {
        if (!StringUtils.hasText(conversationId)) {
            return null;
        }
        return listMyConversations(requesterId, MAX_LIMIT).stream()
                .filter(conversation -> conversationId.trim().equals(conversation.conversationId()))
                .findFirst()
                .map(ConversationToolItem::name)
                .orElse(null);
    }

    private int resolvePage(Integer page) {
        if (page == null || page <= 0) {
            return DEFAULT_PAGE;
        }
        return page;
    }

    private int resolveLimit(Integer limit, int fallback) {
        if (limit == null || limit <= 0) {
            return fallback;
        }
        return Math.min(MAX_LIMIT, limit);
    }

    private String requireRequester(String requesterId) {
        if (!StringUtils.hasText(requesterId)) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        return requesterId.trim();
    }

}
