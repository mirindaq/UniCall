package iuh.fit.task_service.repositories;

import iuh.fit.task_service.entities.TaskGroup;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskGroupRepository extends MongoRepository<TaskGroup, String> {
    List<TaskGroup> findByMemberIdsContainingOrderByUpdatedAtDesc(String memberId);

    List<TaskGroup> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);
}
