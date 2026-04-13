package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.ConversationBlock;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationBlockRepository extends MongoRepository<ConversationBlock, String> {
    List<ConversationBlock> findByConversationId(String conversationId);

    Optional<ConversationBlock> findByConversationIdAndBlockerIdAndBlockedUserId(
            String conversationId,
            String blockerId,
            String blockedUserId
    );

    long deleteByConversationIdAndBlockerIdAndBlockedUserId(
            String conversationId,
            String blockerId,
            String blockedUserId
    );
}

