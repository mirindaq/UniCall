package iuh.fit.friend_service.repositories;

import iuh.fit.friend_service.entities.FriendRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface FriendRequestRepository
                extends JpaRepository<FriendRequest, String>, JpaSpecificationExecutor<FriendRequest> {

}