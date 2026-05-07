package iuh.fit.notification_service.repositories;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import iuh.fit.notification_service.entities.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByIdentityUserIdOrderByCreatedAtDesc(String identityUserId, Pageable pageable);

    long countByIdentityUserIdAndReadFalse(String identityUserId);
}
