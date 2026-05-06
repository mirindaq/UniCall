package iuh.fit.chat_service.repositories;

import iuh.fit.chat_service.entities.AiMessageVector;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AiMessageVectorRepository extends MongoRepository<AiMessageVector, String> {
    Optional<AiMessageVector> findByIdMessageAndEmbeddingModel(String idMessage, String embeddingModel);

    List<AiMessageVector> findByIdConversationAndEmbeddingModelAndIdMessageIn(
            String idConversation,
            String embeddingModel,
            Collection<String> idMessages
    );

    List<AiMessageVector> findByIdConversationAndEmbeddingModelOrderByTimeSentDesc(
            String idConversation,
            String embeddingModel,
            Pageable pageable
    );
}

