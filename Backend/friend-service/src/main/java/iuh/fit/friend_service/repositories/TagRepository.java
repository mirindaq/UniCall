package iuh.fit.friend_service.repositories;

import iuh.fit.friend_service.entities.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TagRepository extends JpaRepository<Tag, String>, JpaSpecificationExecutor<Tag> {
}
