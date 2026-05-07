package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.response.ConversationBlockStatusResponse;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.ConversationBlock;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.repositories.ConversationBlockRepository;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.chat_service.services.ConversationBlockService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConversationBlockServiceImpl implements ConversationBlockService {
    private final ConversationRepository conversationRepository;
    private final ConversationBlockRepository conversationBlockRepository;
    private final ChatConversationService chatConversationService;

    @Override
    public ConversationBlockStatusResponse getBlockStatus(String identityUserId, String conversationId) {
        Conversation conversation = requireParticipantConversation(identityUserId, conversationId);
        if (conversation.getType() != ConversationType.DOUBLE) {
            return ConversationBlockStatusResponse.builder()
                    .conversationId(conversationId)
                    .blocked(false)
                    .blockedByMe(false)
                    .blockedByOther(false)
                    .build();
        }

        String peerId = resolveDirectPeerId(conversation, identityUserId);
        return buildStatus(conversationId, identityUserId, peerId);
    }

    @Override
    public ConversationBlockStatusResponse blockConversation(String identityUserId, String conversationId) {
        Conversation conversation = requireParticipantConversation(identityUserId, conversationId);
        if (conversation.getType() != ConversationType.DOUBLE) {
            throw new InvalidParamException("Chỉ có thể chặn nhắn tin ở hội thoại 1-1");
        }

        String peerId = resolveDirectPeerId(conversation, identityUserId);
        boolean existed = conversationBlockRepository
                .findByConversationIdAndBlockerIdAndBlockedUserId(conversationId, identityUserId, peerId)
                .isPresent();
        if (!existed) {
            ConversationBlock block = new ConversationBlock();
            block.setId(UUID.randomUUID().toString());
            block.setConversationId(conversationId);
            block.setBlockerId(identityUserId);
            block.setBlockedUserId(peerId);
            block.setBlockedAt(LocalDateTime.now());
            conversationBlockRepository.save(block);
        }
        return buildStatus(conversationId, identityUserId, peerId);
    }

    @Override
    public ConversationBlockStatusResponse unblockConversation(String identityUserId, String conversationId) {
        Conversation conversation = requireParticipantConversation(identityUserId, conversationId);
        if (conversation.getType() != ConversationType.DOUBLE) {
            throw new InvalidParamException("Chỉ có thể bỏ chặn nhắn tin ở hội thoại 1-1");
        }

        String peerId = resolveDirectPeerId(conversation, identityUserId);
        conversationBlockRepository.deleteByConversationIdAndBlockerIdAndBlockedUserId(
                conversationId,
                identityUserId,
                peerId
        );
        return buildStatus(conversationId, identityUserId, peerId);
    }

    @Override
    public void assertCanSendMessage(String identityUserId, String conversationId) {
        ConversationBlockStatusResponse status = getBlockStatus(identityUserId, conversationId);
        if (!status.isBlocked()) {
            return;
        }
        if (status.isBlockedByMe()) {
            throw new InvalidParamException("Bạn đã chặn người này. Hãy bỏ chặn để tiếp tục nhắn tin.");
        }
        throw new InvalidParamException("Bạn không thể nhắn tin vì người này đã chặn bạn.");
    }

    private Conversation requireParticipantConversation(String identityUserId, String conversationId) {
        if (!StringUtils.hasText(identityUserId)) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        if (!StringUtils.hasText(conversationId)) {
            throw new InvalidParamException("conversationId không hợp lệ");
        }
        chatConversationService.requireParticipant(conversationId, identityUserId);
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hội thoại"));
    }

    private static String resolveDirectPeerId(Conversation conversation, String identityUserId) {
        List<ParticipantInfo> participants = conversation.getParticipantInfos();
        if (participants == null || participants.isEmpty()) {
            throw new InvalidParamException("Hội thoại không có thành viên");
        }
        return participants.stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(StringUtils::hasText)
                .filter(id -> !id.equals(identityUserId))
                .findFirst()
                .orElseThrow(() -> new InvalidParamException("Không xác định được người nhận trong hội thoại 1-1"));
    }

    private ConversationBlockStatusResponse buildStatus(String conversationId, String identityUserId, String peerId) {
        List<ConversationBlock> allBlocks = conversationBlockRepository.findByConversationId(conversationId);
        ConversationBlock myBlock = allBlocks.stream()
                .filter(block -> identityUserId.equals(block.getBlockerId()) && peerId.equals(block.getBlockedUserId()))
                .findFirst()
                .orElse(null);
        ConversationBlock peerBlock = allBlocks.stream()
                .filter(block -> peerId.equals(block.getBlockerId()) && identityUserId.equals(block.getBlockedUserId()))
                .findFirst()
                .orElse(null);

        boolean blockedByMe = myBlock != null;
        boolean blockedByOther = peerBlock != null;

        LocalDateTime blockedAt = blockedByMe
                ? myBlock.getBlockedAt()
                : (blockedByOther ? peerBlock.getBlockedAt() : null);

        return ConversationBlockStatusResponse.builder()
                .conversationId(conversationId)
                .directPeerId(peerId)
                .blocked(blockedByMe || blockedByOther)
                .blockedByMe(blockedByMe)
                .blockedByOther(blockedByOther)
                .blockedAt(blockedAt)
                .build();
    }
}

