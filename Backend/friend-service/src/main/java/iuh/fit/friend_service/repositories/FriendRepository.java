package iuh.fit.friend_service.repositories;

import iuh.fit.friend_service.entities.Friend;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface FriendRepository extends JpaRepository<Friend, String>, JpaSpecificationExecutor<Friend> {

}