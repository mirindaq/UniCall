package iuh.fit.chat_service.services.impl;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import iuh.fit.chat_service.config.LiveKitProperties;
import iuh.fit.chat_service.dtos.response.SfuAccessTokenResponse;
import iuh.fit.chat_service.entities.Conversation;
import iuh.fit.chat_service.entities.ParticipantInfo;
import iuh.fit.chat_service.repositories.ConversationRepository;
import iuh.fit.chat_service.services.SfuTokenService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.common_service.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SfuTokenServiceImpl implements SfuTokenService {
    private final ConversationRepository conversationRepository;
    private final LiveKitProperties liveKitProperties;

    @Override
    public SfuAccessTokenResponse createConversationCallToken(String identityUserId, String conversationId, String callId) {
        if (identityUserId == null || identityUserId.isBlank()) {
            throw new InvalidParamException("Thiếu người dùng đã xác thực");
        }
        if (conversationId == null || conversationId.isBlank()) {
            throw new InvalidParamException("Thiếu conversationId");
        }
        if (!liveKitProperties.isEnabled()) {
            throw new InvalidParamException("LiveKit SFU đang tắt");
        }
        if (liveKitProperties.getApiKey() == null || liveKitProperties.getApiKey().isBlank()
                || liveKitProperties.getApiSecret() == null || liveKitProperties.getApiSecret().isBlank()) {
            throw new InvalidParamException("LiveKit chưa cấu hình api key/secret");
        }

        Conversation conversation = conversationRepository.findById(conversationId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hội thoại"));

        boolean isMember = conversation.getParticipantInfos() != null
                && conversation.getParticipantInfos().stream()
                .map(ParticipantInfo::getIdAccount)
                .anyMatch(identityUserId::equals);
        if (!isMember) {
            throw new InvalidParamException("Bạn không thuộc cuộc hội thoại này");
        }

        String normalizedCallId = (callId == null || callId.isBlank()) ? UUID.randomUUID().toString() : callId.trim();
        String roomName = "conversation-" + conversation.getIdConversation();
        long ttlSeconds = Math.max(60L, liveKitProperties.getTokenTtlSeconds());
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime expiresAt = now.plusSeconds(ttlSeconds);

        Map<String, Object> videoGrant = new LinkedHashMap<>();
        videoGrant.put("roomJoin", true);
        videoGrant.put("room", roomName);
        videoGrant.put("canPublish", true);
        videoGrant.put("canSubscribe", true);

        Algorithm algorithm = Algorithm.HMAC256(liveKitProperties.getApiSecret());
        String token = JWT.create()
                .withIssuer(liveKitProperties.getApiKey())
                .withSubject(identityUserId)
                .withIssuedAt(Date.from(now.toInstant(ZoneOffset.UTC)))
                .withNotBefore(Date.from(now.minusSeconds(5).toInstant(ZoneOffset.UTC)))
                .withExpiresAt(Date.from(expiresAt.toInstant(ZoneOffset.UTC)))
                .withClaim("video", videoGrant)
                .withClaim("callId", normalizedCallId)
                .sign(algorithm);

        return SfuAccessTokenResponse.builder()
                .callId(normalizedCallId)
                .roomName(roomName)
                .url(liveKitProperties.getUrl())
                .token(token)
                .expiresAt(expiresAt)
                .build();
    }
}

