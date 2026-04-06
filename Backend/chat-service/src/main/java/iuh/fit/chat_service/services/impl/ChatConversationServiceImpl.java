package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.clients.GrpcUserServiceClient;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ChatConversationServiceImpl implements ChatConversationService {

    private final ConversationRepository conversationRepository;
    private final GrpcUserServiceClient grpcUserServiceClient;

    @Override
    public List<ConversationResponse> listMyConversations(String identityUserId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache = new HashMap<>();
        return conversationRepository.findByParticipantAccount(identityUserId).stream()
                .map(conversation -> toConversationResponse(conversation, identityUserId, userDisplayCache))
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
        Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache = new HashMap<>();
        return conversationRepository.findDirectConversationBetweenPair(pair)
                .map(conversation -> toConversationResponse(conversation, identityUserId, userDisplayCache))
                .orElseGet(() -> toConversationResponse(
                        conversationRepository.save(newDirectConversation(identityUserId, other)),
                        identityUserId,
                        userDisplayCache
                ));
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

    private ConversationResponse toConversationResponse(
            Conversation conversation,
            String currentIdentityUserId,
            Map<String, GrpcUserServiceClient.UserDisplayInfo> userDisplayCache
    ) {
        ConversationResponse response = ConversationResponse.from(conversation);
        if (response == null) {
            return null;
        }
        if (conversation.getType() != ConversationType.DOUBLE) {
            return response;
        }
        if (response.getName() != null && !response.getName().isBlank()) {
            return response;
        }

        String peerIdentityUserId = conversation.getParticipantInfos() == null
                ? null
                : conversation.getParticipantInfos().stream()
                .map(ParticipantInfo::getIdAccount)
                .filter(id -> id != null && !id.isBlank() && !id.equals(currentIdentityUserId))
                .findFirst()
                .orElse(null);
        if (peerIdentityUserId == null || peerIdentityUserId.isBlank()) {
            return response;
        }

        GrpcUserServiceClient.UserDisplayInfo displayInfo = userDisplayCache.computeIfAbsent(
                peerIdentityUserId,
                key -> grpcUserServiceClient.getUserDisplayInfo(key)
                        .orElse(new GrpcUserServiceClient.UserDisplayInfo(key, null))
        );

        response.setName(displayInfo.displayName());
        if (response.getAvatar() == null || response.getAvatar().isBlank()) {
            response.setAvatar(displayInfo.avatar());
        }
        return response;
    }
}
