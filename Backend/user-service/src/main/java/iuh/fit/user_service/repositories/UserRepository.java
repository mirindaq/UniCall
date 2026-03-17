package iuh.fit.user_service.repositories;

import iuh.fit.user_service.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByIdentityUserId(String identityUserId);

    boolean existsByPhoneNumber(String phoneNumber);

    void deleteByIdentityUserId(String identityUserId);
}
