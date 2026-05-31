package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.AiAssistantThread;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AiAssistantThreadRepository extends MongoRepository<AiAssistantThread, String> {
    Optional<AiAssistantThread> findFirstByOwnerUserIdOrderByUpdatedAtDesc(String ownerUserId);
}
