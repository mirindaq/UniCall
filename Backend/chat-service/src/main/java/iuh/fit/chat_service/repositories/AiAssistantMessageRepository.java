package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.AiAssistantMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AiAssistantMessageRepository extends MongoRepository<AiAssistantMessage, String> {
    Page<AiAssistantMessage> findByOwnerUserIdAndThreadIdOrderByCreatedAtDesc(
            String ownerUserId,
            String threadId,
            Pageable pageable
    );
}
