package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.dtos.request.CreateDirectConversationRequest;
import iuh.fit.chat_service.dtos.response.ConversationResponse;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.enums.ConversationType;
import iuh.fit.chat_service.enums.ParicipantRole;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.services.ChatConversationService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ChatConversationServiceImpl implements ChatConversationService {

    private final ConversationRepository conversationRepository;

    @Override
    public List<ConversationResponse> listMyConversations(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        return conversationRepository.findByParticipantAccount(identityUserId).stream()
                .map(ConversationResponse::from)
                .toList();
    }

    @Override
    public ConversationResponse getOrCreateDirect(String identityUserId, CreateDirectConversationRequest request) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        String other = request.getOtherUserId();
        if (other == null || other.isBlank()) {
            throw new InvalidParamException("otherUserId không hợp lệ");
        }
        if (other.equals(identityUserId)) {
            throw new InvalidParamException("Không thể tạo hội thoại 1-1 với chính mình");
        }
        List<String> pair = Stream.of(identityUserId, other)
                .sorted(Comparator.naturalOrder())
                .toList();
        return conversationRepository.findDirectConversationBetweenPair(pair)
                .map(ConversationResponse::from)
                .orElseGet(() -> ConversationResponse.from(conversationRepository.save(newDirectConversation(identityUserId, other))));
    }

    @Override
    public void requireParticipant(String conversationId, String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hội thoại"));
        List<ParticipantInfo> infos = conversation.getParticipantInfos();
        if (infos == null || infos.isEmpty()) {
            throw new InvalidParamException("Hội thoại không có thành viên");
        }
        boolean allowed = infos.stream().anyMatch(p -> identityUserId.equals(p.getIdAccount()));
        if (!allowed) {
            throw new InvalidParamException("Bạn không thuộc cuộc hội thoại này");
        }
    }

    private static Conversation newDirectConversation(String identityUserId, String otherUserId) {
        LocalDateTime now = LocalDateTime.now();
        List<ParticipantInfo> participantInfos = new ArrayList<>();
        participantInfos.add(new ParticipantInfo(identityUserId, ParicipantRole.USER, null, now));
        participantInfos.add(new ParticipantInfo(otherUserId, ParicipantRole.USER, null, now));

        Conversation conversation = new Conversation();
        conversation.setIdConversation(UUID.randomUUID().toString());
        conversation.setType(ConversationType.DOUBLE);
        conversation.setName(null);
        conversation.setAvatar(null);
        conversation.setDateCreate(now);
        conversation.setDateUpdateMessage(now);
        conversation.setLastMessageContent(null);
        conversation.setNumberMember(2);
        conversation.setParticipantInfos(participantInfos);
        return conversation;
    }
}
