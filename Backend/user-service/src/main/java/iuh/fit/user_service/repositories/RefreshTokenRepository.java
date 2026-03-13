package iuh.fit.user_service.repositories;

import iuh.fit.user_service.entities.RefreshToken;
import iuh.fit.user_service.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
}