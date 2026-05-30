package iuh.fit.task_service.repositories;

import iuh.fit.task_service.entities.TaskComment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TaskCommentRepository extends MongoRepository<TaskComment, String> {
    List<TaskComment> findByTaskIdOrderByCreatedAtAsc(String taskId);

    long deleteByTaskId(String taskId);

    long deleteByGroupId(String groupId);
}
