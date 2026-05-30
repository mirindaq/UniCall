package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.AiAssistantThread;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface AiAssistantThreadRepository extends MongoRepository<AiAssistantThread, String> {
    @Query(value = "{ 'ownerIdentityUserId': ?0 }", sort = "{ 'updatedAt': -1 }")
    List<AiAssistantThread> findByOwnerIdentityUserId(String ownerIdentityUserId);

    Optional<AiAssistantThread> findByIdThreadAndOwnerIdentityUserId(String idThread, String ownerIdentityUserId);
}
