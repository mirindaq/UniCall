package iuh.fit.user_service.repositories;

import iuh.fit.user_service.entities.User;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    boolean existsByIdentityUserId(String identityUserId);

    boolean existsByPhoneNumber(String phoneNumber);
    boolean existsByEmail(String email);

    Optional<User> findByIdentityUserId(String identityUserId);

    void deleteByIdentityUserId(String identityUserId);

    List<User> findAllByDeletionPendingIsTrueAndDeletionRequestedAtLessThanEqual(LocalDateTime deadline);
}
