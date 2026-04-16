package iuh.fit.friend_service.repositories;

import iuh.fit.friend_service.entities.Relationship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RelationshipRepository extends JpaRepository<Relationship, String>, JpaSpecificationExecutor<Relationship> {
}
