package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.CallSession;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CallSessionRepository extends MongoRepository<CallSession, String> {
}
