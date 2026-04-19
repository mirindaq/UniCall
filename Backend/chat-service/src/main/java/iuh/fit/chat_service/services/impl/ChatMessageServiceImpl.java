package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.request.ChatSendStompPayload;
import iuh.fit.chat_service.dtos.request.CreateDirectConversationRequest;
import iuh.fit.chat_service.dtos.request.ForwardMessageRequest;
import iuh.fit.chat_service.dtos.request.MessageAttachmentRequest;
import iuh.fit.chat_service.dtos.request.SendChatMessageRequest;
import iuh.fit.chat_service.dtos.request.UpdateMessageReactionRequest;
import iuh.fit.chat_service.dtos.response.AttachmentResponse;
import iuh.fit.chat_service.dtos.response.ForwardMessageResponse;
import iuh.fit.chat_service.dtos.response.MessageResponse;
import iuh.fit.chat_service.entities.Attachment;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.Message;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.AttachmentType;
import iuh.fit.chat_service.enums.MessageEnum;
import iuh.fit.chat_service.enums.MessageType;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.repositories.MessageRepository;
import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.chat_service.services.ChatMessageService;
import iuh.fit.chat_service.services.AiAssistantService;
import iuh.fit.chat_service.services.ConversationBlockService;
import iuh.fit.chat_service.services.RealtimeEventPublisher;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatMessageServiceImpl implements ChatMessageService {

    private static final Pattern URL_PATTERN = Pattern.compile("https?://\\S+", Pattern.CASE_INSENSITIVE);
    private static final Pattern UUID_FILE_PREFIX_REGEX = Pattern.compile(
        "^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[-_]+(.+)$",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern UUID_FILE_PREFIX_ANYWHERE_REGEX = Pattern.compile(
        "[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[-_]+(.+)$",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern UUID_AT_START_REGEX = Pattern.compile(
        "^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(.*)$",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern LONG_HASH_PREFIX_REGEX = Pattern.compile(
        "^[0-9a-f]{20,}[-_]+(.+)$",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern ID_ONLY_FILENAME_REGEX = Pattern.compile(
        "^[0-9a-f-]{24,}(\\.[a-z0-9]{1,8})?$",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern FILE_MESSAGE_REGEX = Pattern.compile("^Đã gửi file:\\s*(.+)$", Pattern.CASE_INSENSITIVE);

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ChatConversationService chatConversationService;
    private final AiAssistantService aiAssistantService;
    @Qualifier("aiAssistantExecutor")
    private final Executor aiAssistantExecutor;
    private final ConversationBlockService conversationBlockService;
    private final RealtimeEventPublisher realtimeEventPublisher;

    @Override
    public PageResponse<MessageResponse> listMessages(
            String identityUserId,
            String conversationId,
            int page,
            int limit
    ) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        if (page < 1) {
            throw new InvalidParamException("page phải >= 1");
        }
        if (limit < 1 || limit > 100) {
            throw new InvalidParamException("limit phải từ 1 đến 100");
        }
        Page<Message> result = messageRepository.findVisibleForParticipant(
                conversationId,
                identityUserId,
                PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "timeSent"))
        );
        return PageResponse.fromPage(result, MessageResponse::from);
    }

    @Override
    public PageResponse<MessageResponse> searchMessages(
            String identityUserId,
            String conversationId,
            String keyword,
            int page,
            int limit
    ) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        if (page < 1) {
            throw new InvalidParamException("page phải >= 1");
        }
        if (limit < 1 || limit > 100) {
            throw new InvalidParamException("limit phải từ 1 đến 100");
        }
        if (!StringUtils.hasText(keyword)) {
            throw new InvalidParamException("keyword không được để trống");
        }

        String regexKeyword = Pattern.quote(keyword.trim());
        Page<Message> result = messageRepository.searchVisibleForParticipant(
                conversationId,
                identityUserId,
                regexKeyword,
                PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "timeSent"))
        );
        return PageResponse.fromPage(result, MessageResponse::from);
    }

    @Override
    public MessageResponse getMessageById(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        if (!StringUtils.hasText(messageId)) {
            throw new InvalidParamException("messageId không được để trống");
        }

        Message message = messageRepository
                .findById(messageId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin nhắn"));

        if (!conversationId.equals(message.getIdConversation())) {
            throw new InvalidParamException("Tin nhắn không thuộc hội thoại này");
        }

        List<String> hiddenForIds = message.getHiddenForAccountIds();
        if (hiddenForIds != null && hiddenForIds.contains(identityUserId)) {
            throw new ResourceNotFoundException("Không tìm thấy tin nhắn");
        }

        return MessageResponse.from(message);
    }

    @Override
    public MessageResponse sendRest(String identityUserId, String conversationId, SendChatMessageRequest request) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        return persistAndBroadcast(
                identityUserId,
                conversationId,
                request.getContent(),
                request.getType(),
                request.getAttachments(),
                request.getReplyToMessageId()
        );
    }

    @Override
    public void sendFromStomp(String identityUserId, ChatSendStompPayload payload) {
        if (payload == null || payload.getConversationId() == null || payload.getConversationId().isBlank()) {
            throw new InvalidParamException("Thiếu conversationId");
        }
        MessageType type = payload.getType() == null ? MessageType.TEXT : payload.getType();
        chatConversationService.requireParticipant(payload.getConversationId(), identityUserId);
        persistAndBroadcast(
                identityUserId,
                payload.getConversationId(),
                payload.getContent(),
                type,
                payload.getAttachments(),
                payload.getReplyToMessageId()
        );
    }

    private MessageResponse persistAndBroadcast(
            String identityUserId,
            String conversationId,
            String content,
            MessageType type,
            List<MessageAttachmentRequest> attachmentRequests,
            String replyToMessageId
    ) {
        conversationBlockService.assertCanSendMessage(identityUserId, conversationId);

        String normalizedContent = content == null ? "" : content.trim();
        List<Attachment> attachments = toAttachments(attachmentRequests);
        if (normalizedContent.isBlank() && attachments.isEmpty()) {
            throw new InvalidParamException("content hoặc attachments không được để trống");
        }
        attachments = appendAutoLinkAttachments(normalizedContent, attachments);

        LocalDateTime now = LocalDateTime.now();
        Message message = new Message();
        message.setIdMessage(UUID.randomUUID().toString());
        message.setIdConversation(conversationId);
        message.setIdAccountSent(identityUserId);
        message.setStatus(MessageEnum.SENT);
        message.setContent(normalizedContent);
        message.setType(type == null ? MessageType.TEXT : type);
        message.setTimeSent(now);
        message.setTimeUpdate(now);
        message.setAttachments(attachments);
        message.setEdited(false);
        message.setPinned(false);
        message.setPinnedByAccountId(null);
        message.setPinnedAt(null);
        message.setReplyToMessageId(resolveReplyToMessageId(conversationId, replyToMessageId));

        Message saved = messageRepository.save(message);

        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        if (conversation != null) {
            conversation.setLastMessageContent(buildLastMessagePreview(normalizedContent, attachments));
            conversation.setDateUpdateMessage(now);
            conversationRepository.save(conversation);
        }

        MessageResponse dto = MessageResponse.from(saved);
        broadcastToParticipants(conversation, dto);
        scheduleAiReplyIfNeeded(conversationId, identityUserId, normalizedContent);
        return dto;
    }

    @Override
    public MessageResponse recallMessage(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = requireMessageInConversation(conversationId, messageId);
        if (!identityUserId.equals(message.getIdAccountSent())) {
            throw new InvalidParamException("Chỉ người gửi mới thu hồi được tin nhắn");
        }
        if (message.isRecalled()) {
            throw new InvalidParamException("Tin nhắn đã được thu hồi");
        }
        LocalDateTime now = LocalDateTime.now();
        message.setRecalled(true);
        message.setContent("Tin nhắn đã thu hồi");
        message.setAttachments(List.of());
        message.setType(MessageType.TEXT);
        message.setPinned(false);
        message.setPinnedByAccountId(null);
        message.setPinnedAt(null);
        message.setTimeUpdate(now);
        Message saved = messageRepository.save(message);
        MessageResponse dto = MessageResponse.from(saved);
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        broadcastToParticipants(conversation, dto);
        return dto;
    }

    @Override
    public MessageResponse pinMessage(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = requireMessageInConversation(conversationId, messageId);
        if (message.isRecalled()) {
            throw new InvalidParamException("Không thể ghim tin nhắn đã thu hồi");
        }
        if (message.isPinned()) {
            return MessageResponse.from(message);
        }

        LocalDateTime now = LocalDateTime.now();
        message.setPinned(true);
        message.setPinnedByAccountId(identityUserId);
        message.setPinnedAt(now);
        message.setTimeUpdate(now);

        Message saved = messageRepository.save(message);
        MessageResponse dto = MessageResponse.from(saved);
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        broadcastToParticipants(conversation, dto);
        return dto;
    }

    @Override
    public MessageResponse unpinMessage(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = requireMessageInConversation(conversationId, messageId);
        if (!message.isPinned()) {
            return MessageResponse.from(message);
        }

        LocalDateTime now = LocalDateTime.now();
        message.setPinned(false);
        message.setPinnedByAccountId(null);
        message.setPinnedAt(null);
        message.setTimeUpdate(now);

        Message saved = messageRepository.save(message);
        MessageResponse dto = MessageResponse.from(saved);
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        broadcastToParticipants(conversation, dto);
        return dto;
    }

    @Override
    public MessageResponse reactMessage(
            String identityUserId,
            String conversationId,
            String messageId,
            UpdateMessageReactionRequest request
    ) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = requireMessageInConversation(conversationId, messageId);
        if (message.isRecalled()) {
            throw new InvalidParamException("Không thể thả cảm xúc cho tin nhắn đã thu hồi");
        }

        String reaction = request == null || request.getReaction() == null ? "" : request.getReaction().trim();
        if (reaction.isBlank()) {
            throw new InvalidParamException("Reaction is required");
        }
        if (reaction.length() > 8) {
            throw new InvalidParamException("Reaction must be at most 8 characters");
        }

        Map<String, List<String>> reactionStacks = normalizeReactionStacks(message);
        List<String> myReactions = reactionStacks.get(identityUserId) == null
                ? new ArrayList<>()
                : new ArrayList<>(reactionStacks.get(identityUserId));
        myReactions.add(reaction);
        if (myReactions.size() > 30) {
            myReactions = new ArrayList<>(myReactions.subList(myReactions.size() - 30, myReactions.size()));
        }
        reactionStacks.put(identityUserId, myReactions);
        message.setReactionStacks(reactionStacks);
        message.setReactions(buildLegacyReactionsFromStacks(reactionStacks));
        message.setTimeUpdate(LocalDateTime.now());

        Message saved = messageRepository.save(message);
        MessageResponse dto = MessageResponse.from(saved);
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        broadcastToParticipants(conversation, dto);
        return dto;
    }

    @Override
    public MessageResponse clearReaction(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = requireMessageInConversation(conversationId, messageId);
        if (message.isRecalled()) {
            return MessageResponse.from(message);
        }

        Map<String, List<String>> reactionStacks = normalizeReactionStacks(message);
        if (!reactionStacks.containsKey(identityUserId)) {
            return MessageResponse.from(message);
        }
        reactionStacks.remove(identityUserId);
        message.setReactionStacks(reactionStacks.isEmpty() ? null : reactionStacks);
        message.setReactions(buildLegacyReactionsFromStacks(reactionStacks));
        message.setTimeUpdate(LocalDateTime.now());

        Message saved = messageRepository.save(message);
        MessageResponse dto = MessageResponse.from(saved);
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        broadcastToParticipants(conversation, dto);
        return dto;
    }

    private static Map<String, String> buildLegacyReactionsFromStacks(Map<String, List<String>> reactionStacks) {
        if (reactionStacks == null || reactionStacks.isEmpty()) {
            return null;
        }
        Map<String, String> legacy = new HashMap<>();
        for (Map.Entry<String, List<String>> entry : reactionStacks.entrySet()) {
            String userId = entry.getKey();
            if (!StringUtils.hasText(userId)) {
                continue;
            }
            List<String> stack = entry.getValue();
            if (stack == null || stack.isEmpty()) {
                continue;
            }
            String latest = stack.get(stack.size() - 1);
            if (!StringUtils.hasText(latest)) {
                continue;
            }
            legacy.put(userId, latest);
        }
        return legacy.isEmpty() ? null : legacy;
    }

    private static Map<String, List<String>> normalizeReactionStacks(Message message) {
        Map<String, List<String>> fromStacks = message.getReactionStacks();
        if (fromStacks != null && !fromStacks.isEmpty()) {
            return new HashMap<>(fromStacks);
        }

        Map<String, String> legacy = message.getReactions();
        if (legacy == null || legacy.isEmpty()) {
            return new HashMap<>();
        }

        Map<String, List<String>> normalized = new HashMap<>();
        for (Map.Entry<String, String> entry : legacy.entrySet()) {
            String userId = entry.getKey();
            String reaction = entry.getValue();
            if (!StringUtils.hasText(userId) || !StringUtils.hasText(reaction)) {
                continue;
            }
            normalized.put(userId, new ArrayList<>(List.of(reaction)));
        }
        return normalized;
    }

    @Override
    public ForwardMessageResponse forwardMessage(
            String identityUserId,
            String conversationId,
            String messageId,
            ForwardMessageRequest request
    ) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message sourceMessage = requireMessageInConversation(conversationId, messageId);

        List<String> hiddenForIds = sourceMessage.getHiddenForAccountIds();
        if (hiddenForIds != null && hiddenForIds.contains(identityUserId)) {
            throw new ResourceNotFoundException("Không tìm thấy tin nhắn");
        }
        if (sourceMessage.isRecalled()) {
            throw new InvalidParamException("Không thể chuyển tiếp tin nhắn đã thu hồi");
        }
        if (sourceMessage.getType() == MessageType.CALL) {
            throw new InvalidParamException("Không thể chuyển tiếp tin nhắn cuộc gọi");
        }

        List<String> targetConversationIds = resolveForwardTargetConversationIds(identityUserId, conversationId, request);
        String note = request == null || request.getNote() == null ? "" : request.getNote().trim();
        MessageType sourceType = sourceMessage.getType() == null ? MessageType.TEXT : sourceMessage.getType();
        List<MessageAttachmentRequest> sourceAttachments = toAttachmentRequests(sourceMessage.getAttachments());

        for (String targetConversationId : targetConversationIds) {
            chatConversationService.requireParticipant(targetConversationId, identityUserId);

            if (StringUtils.hasText(note)) {
                persistAndBroadcast(
                        identityUserId,
                        targetConversationId,
                        note,
                        MessageType.TEXT,
                        List.of(),
                        null
                );
            }

            persistAndBroadcast(
                    identityUserId,
                    targetConversationId,
                    sourceMessage.getContent(),
                    sourceType,
                    sourceAttachments,
                    null
            );
        }

        return ForwardMessageResponse.builder()
                .forwardedConversationCount(targetConversationIds.size())
                .targetConversationIds(targetConversationIds)
                .build();
    }

    @Override
    public void hideMessageForMe(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = requireMessageInConversation(conversationId, messageId);
        List<String> hidden = message.getHiddenForAccountIds();
        if (hidden == null) {
            hidden = new ArrayList<>();
        }
        if (hidden.contains(identityUserId)) {
            return;
        }
        hidden.add(identityUserId);
        message.setHiddenForAccountIds(hidden);
        messageRepository.save(message);
    }

    private Message requireMessageInConversation(String conversationId, String messageId) {
        if (!StringUtils.hasText(messageId)) {
            throw new InvalidParamException("messageId không được để trống");
        }

        Message message = messageRepository
                .findById(messageId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin nhắn"));

        if (!conversationId.equals(message.getIdConversation())) {
            throw new InvalidParamException("Tin nhắn không thuộc hội thoại này");
        }

        return message;
    }

    private List<String> resolveForwardTargetConversationIds(
            String identityUserId,
            String sourceConversationId,
            ForwardMessageRequest request
    ) {
        LinkedHashSet<String> targetConversationIds = new LinkedHashSet<>();

        if (request != null && request.getTargetConversationIds() != null) {
            for (String rawConversationId : request.getTargetConversationIds()) {
                if (rawConversationId == null) {
                    continue;
                }
                String conversationId = rawConversationId.trim();
                if (conversationId.isBlank()) {
                    continue;
                }
                targetConversationIds.add(conversationId);
            }
        }

        if (request != null && request.getTargetUserIds() != null) {
            for (String rawUserId : request.getTargetUserIds()) {
                if (rawUserId == null) {
                    continue;
                }
                String targetUserId = rawUserId.trim();
                if (targetUserId.isBlank() || identityUserId.equals(targetUserId)) {
                    continue;
                }

                CreateDirectConversationRequest directRequest = new CreateDirectConversationRequest();
                directRequest.setOtherUserId(targetUserId);
                String directConversationId = chatConversationService
                        .getOrCreateDirect(identityUserId, directRequest)
                        .getIdConversation();
                if (StringUtils.hasText(directConversationId)) {
                    targetConversationIds.add(directConversationId);
                }
            }
        }

        targetConversationIds.remove(sourceConversationId);
        if (targetConversationIds.isEmpty()) {
            throw new InvalidParamException("Cần chọn ít nhất một nơi nhận để chuyển tiếp");
        }

        return new ArrayList<>(targetConversationIds);
    }

    private void scheduleAiReplyIfNeeded(String conversationId, String requesterId, String content) {
        if (!StringUtils.hasText(conversationId) || !StringUtils.hasText(requesterId) || !StringUtils.hasText(content)) {
            return;
        }
        CompletableFuture.runAsync(() -> {
            try {
                aiAssistantService
                        .buildReply(conversationId, requesterId, content)
                        .ifPresent(reply -> persistAiReplyMessage(conversationId, reply));
            } catch (Exception ignored) {
                // AI là tính năng bổ sung, không làm gián đoạn luồng chat chính.
            }
        }, aiAssistantExecutor);
    }

    private void persistAiReplyMessage(String conversationId, AiAssistantService.AiAssistantReply reply) {
        if (reply == null || !StringUtils.hasText(reply.botId())) {
            return;
        }
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        if (conversation == null || conversation.getParticipantInfos() == null || conversation.getParticipantInfos().isEmpty()) {
            return;
        }

        List<Attachment> attachments = new ArrayList<>();
        MessageType messageType = MessageType.TEXT;
        if (StringUtils.hasText(reply.imageUrl())) {
            Attachment attachment = new Attachment();
            attachment.setIdAttachment(UUID.randomUUID().toString());
            attachment.setType(AttachmentType.IMAGE);
            attachment.setUrl(reply.imageUrl().trim());
            attachment.setOrder(0);
            attachment.setTimeUpload(LocalDateTime.now());
            attachments.add(attachment);
            messageType = StringUtils.hasText(reply.content()) ? MessageType.MIX : MessageType.NONTEXT;
        }

        String normalizedContent = reply.content() == null ? "" : reply.content().trim();
        if (normalizedContent.isBlank() && attachments.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        Message aiMessage = new Message();
        aiMessage.setIdMessage(UUID.randomUUID().toString());
        aiMessage.setIdConversation(conversationId);
        aiMessage.setIdAccountSent(reply.botId().trim());
        aiMessage.setStatus(MessageEnum.SENT);
        aiMessage.setContent(normalizedContent);
        aiMessage.setType(messageType);
        aiMessage.setTimeSent(now);
        aiMessage.setTimeUpdate(now);
        aiMessage.setAttachments(attachments.isEmpty() ? List.of() : attachments);
        aiMessage.setEdited(false);
        aiMessage.setPinned(false);
        aiMessage.setPinnedByAccountId(null);
        aiMessage.setPinnedAt(null);
        aiMessage.setReplyToMessageId(null);

        Message saved = messageRepository.save(aiMessage);
        conversation.setLastMessageContent(buildLastMessagePreview(normalizedContent, attachments));
        conversation.setDateUpdateMessage(now);
        conversationRepository.save(conversation);

        broadcastToParticipants(conversation, MessageResponse.from(saved));
    }

    private static List<MessageAttachmentRequest> toAttachmentRequests(List<Attachment> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return List.of();
        }

        List<MessageAttachmentRequest> requests = new ArrayList<>(attachments.size());
        for (Attachment attachment : attachments) {
            if (attachment == null || attachment.getType() == null || !StringUtils.hasText(attachment.getUrl())) {
                continue;
            }

            MessageAttachmentRequest request = new MessageAttachmentRequest();
            request.setType(attachment.getType());
            request.setUrl(attachment.getUrl());
            request.setSize(attachment.getSize());
            request.setMetaData(attachment.getMetaData());
            request.setOrder(attachment.getOrder());
            requests.add(request);
        }

        return requests;
    }

    private String resolveReplyToMessageId(String conversationId, String replyToMessageId) {
        if (replyToMessageId == null || replyToMessageId.isBlank()) {
            return null;
        }
        String trimmed = replyToMessageId.trim();
        Message ref = messageRepository
                .findById(trimmed)
                .orElseThrow(() -> new InvalidParamException("Tin nhắn trả lời không tồn tại"));
        if (!conversationId.equals(ref.getIdConversation())) {
            throw new InvalidParamException("Tin nhắn trả lời không thuộc hội thoại này");
        }
        return ref.getIdMessage();
    }

    private void broadcastToParticipants(Conversation conversation, MessageResponse message) {
        if (conversation == null || conversation.getParticipantInfos() == null || message == null) {
            return;
        }
        List<String> participantIds = conversation.getParticipantInfos().stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .collect(Collectors.toList());

        for (String participantId : participantIds) {
            realtimeEventPublisher.publishUserMessageEvent(participantId, conversation.getIdConversation(), message);
        }
    }

    private static List<Attachment> toAttachments(List<MessageAttachmentRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }
        List<Attachment> attachments = new ArrayList<>(requests.size());
        for (MessageAttachmentRequest req : requests) {
            if (req == null || req.getType() == null || req.getUrl() == null || req.getUrl().isBlank()) {
                continue;
            }
            Attachment attachment = new Attachment();
            attachment.setIdAttachment(UUID.randomUUID().toString());
            attachment.setType(req.getType());
            attachment.setUrl(req.getUrl().trim());
            attachment.setSize(req.getSize());
            attachment.setMetaData(req.getMetaData());
            attachment.setOrder(req.getOrder() == null ? 0 : req.getOrder());
            attachment.setTimeUpload(LocalDateTime.now());
            attachments.add(attachment);
        }
        return attachments;
    }

    private static List<Attachment> appendAutoLinkAttachments(String content, List<Attachment> source) {
        List<Attachment> attachments = source == null ? new ArrayList<>() : new ArrayList<>(source);
        if (content == null || content.isBlank()) {
            return attachments;
        }

        Set<String> existingLinkUrls = attachments.stream()
                .filter(attachment -> attachment != null
                        && attachment.getType() == AttachmentType.LINK
                        && attachment.getUrl() != null
                        && !attachment.getUrl().isBlank())
                .map(attachment -> attachment.getUrl().trim())
                .collect(Collectors.toCollection(LinkedHashSet::new));

        int nextOrder = attachments.stream()
            .filter(attachment -> attachment != null)
                .map(Attachment::getOrder)
                .max(Integer::compareTo)
                .orElse(-1) + 1;

        for (String url : extractUrls(content)) {
            if (!existingLinkUrls.add(url)) {
                continue;
            }
            Attachment linkAttachment = new Attachment();
            linkAttachment.setIdAttachment(UUID.randomUUID().toString());
            linkAttachment.setType(AttachmentType.LINK);
            linkAttachment.setUrl(url);
            linkAttachment.setOrder(nextOrder++);
            linkAttachment.setTimeUpload(LocalDateTime.now());
            attachments.add(linkAttachment);
        }

        return attachments;
    }

    private static List<String> extractUrls(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }

        var matcher = URL_PATTERN.matcher(content);
        LinkedHashSet<String> urls = new LinkedHashSet<>();
        while (matcher.find()) {
            String raw = matcher.group();
            if (raw == null || raw.isBlank()) {
                continue;
            }
            String normalized = raw.trim().replaceAll("[),.;!?]+$", "");
            if (!normalized.isBlank()) {
                urls.add(normalized);
            }
        }

        return new ArrayList<>(urls);
    }

    private static String buildLastMessagePreview(String content, List<Attachment> attachments) {
        if (attachments != null && !attachments.isEmpty()) {
            AttachmentType type = attachments.get(0).getType();
            if (type == AttachmentType.GIF) {
                return "Đã gửi GIF";
            }
            if (type == AttachmentType.STICKER) {
                return "Đã gửi sticker";
            }
            if (type == AttachmentType.IMAGE) {
                return "Đã gửi hình ảnh";
            }
            if (type == AttachmentType.VIDEO) {
                return "Đã gửi video";
            }
            if (type == AttachmentType.AUDIO) {
                return "Đã gửi file âm thanh";
            }
            if (type == AttachmentType.LINK) {
                return "Đã gửi link";
            }
            if (type == AttachmentType.FILE) {
                if (content != null && !content.isBlank()) {
                    return content;
                }
                return "Đã gửi file";
            }
            return "Đã gửi tệp đính kèm";
        }

        if (content != null && URL_PATTERN.matcher(content).find()) {
            return "Đã gửi link";
        }

        return content;
    }

    @Override
    public List<AttachmentResponse> getAttachments(
            String identityUserId,
            String conversationId,
            String type,
            String senderId,
            String fromDate,
            String toDate,
            String search
    ) {
        chatConversationService.requireParticipant(conversationId, identityUserId);

        LocalDateTime fromDateTime = parseDateParam(fromDate, false, "fromDate");
        LocalDateTime toDateTime = parseDateParam(toDate, true, "toDate");
        if (fromDateTime != null && toDateTime != null && fromDateTime.isAfter(toDateTime)) {
            throw new InvalidParamException("fromDate phải nhỏ hơn hoặc bằng toDate");
        }
        String normalizedSenderId = senderId == null ? null : senderId.trim();
        if (normalizedSenderId != null && normalizedSenderId.isBlank()) {
            normalizedSenderId = null;
        }
        String normalizedSearch = normalizeSearchKeyword(search);
        
        // Get all messages with attachments, paginated to avoid loading too much data
        Page<Message> messagesWithAttachments = messageRepository.findByIdConversationWithAttachments(
                conversationId,
                PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "timeSent"))
        );

        List<AttachmentResponse> attachmentResponses = new ArrayList<>();
        
        for (Message message : messagesWithAttachments.getContent()) {
            if (message.getAttachments() == null || message.getAttachments().isEmpty()) {
                continue;
            }

            if (normalizedSenderId != null && !normalizedSenderId.equals(message.getIdAccountSent())) {
                continue;
            }

            LocalDateTime timeSent = message.getTimeSent();
            if (fromDateTime != null && (timeSent == null || timeSent.isBefore(fromDateTime))) {
                continue;
            }
            if (toDateTime != null && (timeSent == null || timeSent.isAfter(toDateTime))) {
                continue;
            }
            
            for (Attachment attachment : message.getAttachments()) {
                if (attachment == null) {
                    continue;
                }

                String attachmentDisplayFileName = deriveAttachmentDisplayFileName(attachment, message.getContent());
                
                // Filter by type if specified
                if (!matchesAttachmentTypeFilter(attachment.getType(), type)) {
                    continue;
                }

                if (!matchesAttachmentSearchFilter(attachment, normalizedSearch, type, attachmentDisplayFileName)) {
                    continue;
                }
                
                AttachmentResponse response = AttachmentResponse.builder()
                        .idAttachment(attachment.getIdAttachment())
                        .type(attachment.getType())
                        .url(attachment.getUrl())
                        .fileName(attachmentDisplayFileName)
                        .size(attachment.getSize())
                        .timeUpload(attachment.getTimeUpload())
                        .timeSent(message.getTimeSent())
                        .messageId(message.getIdMessage())
                        .senderId(message.getIdAccountSent())
                        .build();
                
                attachmentResponses.add(response);
            }
        }
        
        return attachmentResponses;
    }

    private static LocalDateTime parseDateParam(String rawValue, boolean endOfDay, String fieldName) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }

        String value = rawValue.trim();
        try {
            if (value.contains("T")) {
                return LocalDateTime.parse(value);
            }

            LocalDate date = LocalDate.parse(value);
            return endOfDay ? date.atTime(LocalTime.MAX) : date.atStartOfDay();
        } catch (DateTimeParseException ex) {
            throw new InvalidParamException(fieldName + " không hợp lệ (yyyy-MM-dd)");
        }
    }

    private static boolean matchesAttachmentTypeFilter(AttachmentType attachmentType, String type) {
        if (type == null || type.isBlank()) {
            return true;
        }

        if ("images".equalsIgnoreCase(type)) {
            return attachmentType == AttachmentType.IMAGE
                    || attachmentType == AttachmentType.VIDEO
                    || attachmentType == AttachmentType.GIF;
        }

        if ("files".equalsIgnoreCase(type)) {
            return attachmentType == AttachmentType.FILE
                    || attachmentType == AttachmentType.AUDIO;
        }

        if ("links".equalsIgnoreCase(type)) {
            return attachmentType == AttachmentType.LINK;
        }

        return true;
    }

    private static String normalizeSearchKeyword(String search) {
        if (!StringUtils.hasText(search)) {
            return null;
        }
        return search.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean matchesAttachmentSearchFilter(
            Attachment attachment,
            String normalizedSearch,
            String requestedType,
            String displayFileName
    ) {
        if (!StringUtils.hasText(normalizedSearch)) {
            return true;
        }

        if (attachment == null) {
            return false;
        }

        AttachmentType attachmentType = attachment.getType();
        boolean isFileSearch = "files".equalsIgnoreCase(requestedType)
                || attachmentType == AttachmentType.FILE
                || attachmentType == AttachmentType.AUDIO;
        if (isFileSearch) {
            return containsIgnoreCase(displayFileName, normalizedSearch);
        }

        boolean isImageSearch = "images".equalsIgnoreCase(requestedType)
                || attachmentType == AttachmentType.IMAGE
                || attachmentType == AttachmentType.VIDEO
                || attachmentType == AttachmentType.GIF;
        if (isImageSearch) {
            return containsIgnoreCase(displayFileName, normalizedSearch);
        }

        boolean isLinkSearch = "links".equalsIgnoreCase(requestedType)
                || attachmentType == AttachmentType.LINK;
        if (isLinkSearch) {
            String url = attachment.getUrl();
            String domain = extractDomain(url);
            return containsIgnoreCase(url, normalizedSearch)
                    || containsIgnoreCase(domain, normalizedSearch);
        }

        return containsIgnoreCase(displayFileName, normalizedSearch);
    }

    private static boolean containsIgnoreCase(String source, String normalizedSearch) {
        if (!StringUtils.hasText(source) || !StringUtils.hasText(normalizedSearch)) {
            return false;
        }
        return source.toLowerCase(Locale.ROOT).contains(normalizedSearch);
    }

    private static String deriveOriginalFileNameFromUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return "";
        }

        String safe = url;
        int queryIndex = safe.indexOf('?');
        if (queryIndex >= 0) {
            safe = safe.substring(0, queryIndex);
        }
        int fragmentIndex = safe.indexOf('#');
        if (fragmentIndex >= 0) {
            safe = safe.substring(0, fragmentIndex);
        }

        String rawName = safe.substring(safe.lastIndexOf('/') + 1);
        String decodedName;
        try {
            decodedName = URLDecoder.decode(rawName, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            decodedName = rawName;
        }

        String stripped = stripUuidPrefix(decodedName);
        return stripped == null ? "" : stripped;
    }

    private static String deriveAttachmentDisplayFileName(Attachment attachment, String messageContent) {
        String fromUrl = deriveOriginalFileNameFromUrl(attachment == null ? null : attachment.getUrl());
        String fromMessage = extractFileNameFromMessageContent(messageContent);

        if (looksLikeStorageGeneratedName(fromUrl) && StringUtils.hasText(fromMessage)) {
            return fromMessage;
        }
        if (StringUtils.hasText(fromUrl)) {
            return fromUrl;
        }
        if (StringUtils.hasText(fromMessage)) {
            return fromMessage;
        }
        return "file";
    }

    private static String extractFileNameFromMessageContent(String content) {
        if (!StringUtils.hasText(content)) {
            return "";
        }

        Matcher matcher = FILE_MESSAGE_REGEX.matcher(content.trim());
        if (matcher.matches() && matcher.group(1) != null) {
            return stripUuidPrefix(matcher.group(1).trim());
        }
        return "";
    }

    private static boolean looksLikeStorageGeneratedName(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return true;
        }

        String normalized = fileName.trim();
        if (ID_ONLY_FILENAME_REGEX.matcher(normalized).matches()) {
            return true;
        }

        return !normalized.contains(".") && normalized.length() >= 24;
    }

    private static String stripUuidPrefix(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return fileName;
        }

        String normalized = fileName.trim();
        Matcher directMatch = UUID_FILE_PREFIX_REGEX.matcher(normalized);
        if (directMatch.matches() && directMatch.group(1) != null) {
            return directMatch.group(1).trim();
        }

        Matcher anywhereMatch = UUID_FILE_PREFIX_ANYWHERE_REGEX.matcher(normalized);
        if (anywhereMatch.find() && anywhereMatch.group(1) != null) {
            return anywhereMatch.group(1).trim();
        }

        Matcher startsWithUuidMatch = UUID_AT_START_REGEX.matcher(normalized);
        if (startsWithUuidMatch.matches()) {
            String remainder = startsWithUuidMatch.group(2);
            if (remainder != null) {
                String cleaned = remainder.replaceFirst("^[-_]+", "").trim();
                if (!cleaned.isBlank()) {
                    return cleaned;
                }
            }
        }

        Matcher longHashPrefixMatch = LONG_HASH_PREFIX_REGEX.matcher(normalized);
        if (longHashPrefixMatch.matches() && longHashPrefixMatch.group(1) != null) {
            return longHashPrefixMatch.group(1).trim();
        }

        if (normalized.length() > 37) {
            char separator = normalized.charAt(36);
            if (separator == '-' || separator == '_') {
                return normalized.substring(37).trim();
            }
        }

        if (ID_ONLY_FILENAME_REGEX.matcher(normalized).matches()) {
            Matcher extensionMatcher = Pattern.compile("\\.[a-z0-9]{1,8}$", Pattern.CASE_INSENSITIVE).matcher(normalized);
            if (extensionMatcher.find()) {
                return "file" + extensionMatcher.group();
            }
            return "file";
        }

        return normalized;
    }

    private static String extractDomain(String url) {
        if (!StringUtils.hasText(url)) {
            return "";
        }
        try {
            URI uri = URI.create(url.trim());
            String host = uri.getHost();
            if (!StringUtils.hasText(host)) {
                return "";
            }
            return host.replaceFirst("(?i)^www\\.", "");
        } catch (Exception ex) {
            return "";
        }
    }
}
