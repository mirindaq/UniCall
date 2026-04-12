package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.request.ChatSendStompPayload;
import iuh.fit.chat_service.dtos.request.MessageAttachmentRequest;
import iuh.fit.chat_service.dtos.request.SendChatMessageRequest;
import iuh.fit.chat_service.dtos.response.AttachmentResponse;
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
import iuh.fit.chat_service.services.RealtimeEventPublisher;
import iuh.fit.common_service.dtos.response.base.PageResponse;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
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

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ChatConversationService chatConversationService;
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
        return dto;
    }

    @Override
    public MessageResponse recallMessage(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = messageRepository
                .findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin nhắn"));
        if (!conversationId.equals(message.getIdConversation())) {
            throw new InvalidParamException("Tin nhắn không thuộc hội thoại này");
        }
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
        message.setTimeUpdate(now);
        Message saved = messageRepository.save(message);
        MessageResponse dto = MessageResponse.from(saved);
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        broadcastToParticipants(conversation, dto);
        return dto;
    }

    @Override
    public void hideMessageForMe(String identityUserId, String conversationId, String messageId) {
        chatConversationService.requireParticipant(conversationId, identityUserId);
        Message message = messageRepository
                .findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin nhắn"));
        if (!conversationId.equals(message.getIdConversation())) {
            throw new InvalidParamException("Tin nhắn không thuộc hội thoại này");
        }
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
                
                // Filter by type if specified
                if (!matchesAttachmentTypeFilter(attachment.getType(), type)) {
                    continue;
                }

                if (!matchesAttachmentSearchFilter(attachment, normalizedSearch)) {
                    continue;
                }
                
                AttachmentResponse response = AttachmentResponse.builder()
                        .idAttachment(attachment.getIdAttachment())
                        .type(attachment.getType())
                        .url(attachment.getUrl())
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

    private static boolean matchesAttachmentSearchFilter(Attachment attachment, String normalizedSearch) {
        if (!StringUtils.hasText(normalizedSearch)) {
            return true;
        }

        String url = attachment.getUrl();
        String domain = extractDomain(url);
        String originalFileName = deriveOriginalFileNameFromUrl(url);
        String typeName = attachment.getType() == null ? "" : attachment.getType().name();
        String size = attachment.getSize();

        return containsIgnoreCase(url, normalizedSearch)
                || containsIgnoreCase(domain, normalizedSearch)
                || containsIgnoreCase(originalFileName, normalizedSearch)
                || containsIgnoreCase(typeName, normalizedSearch)
                || containsIgnoreCase(size, normalizedSearch);
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

        if (normalized.length() > 37) {
            char separator = normalized.charAt(36);
            if (separator == '-' || separator == '_') {
                return normalized.substring(37).trim();
            }
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
