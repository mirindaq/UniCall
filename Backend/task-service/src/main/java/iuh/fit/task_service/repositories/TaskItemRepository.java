package iuh.fit.task_service.repositories;

import iuh.fit.task_service.entities.TaskItem;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskItemRepository extends MongoRepository<TaskItem, String> {
    List<TaskItem> findByGroupIdOrderByCreatedAtDesc(String groupId);

    List<TaskItem> findByGroupIdAndColumnIdOrderByCreatedAtDesc(String groupId, String columnId);

    List<TaskItem> findByAssigneeIdsContainingOrderByUpdatedAtDesc(String assigneeId);

    long deleteByGroupId(String groupId);
}
