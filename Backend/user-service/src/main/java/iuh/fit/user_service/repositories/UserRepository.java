package iuh.fit.user_service.repositories;

import iuh.fit.user_service.entities.User;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            SELECT u FROM User u
            WHERE LOWER(u.identityUserId) LIKE %:keyword%
               OR LOWER(u.phoneNumber) LIKE %:keyword%
               OR LOWER(u.email) LIKE %:keyword%
               OR LOWER(u.firstName) LIKE %:keyword%
               OR LOWER(u.lastName) LIKE %:keyword%
            """)
    Page<User> findByAdminKeyword(@Param("keyword") String keyword, Pageable pageable);
}
