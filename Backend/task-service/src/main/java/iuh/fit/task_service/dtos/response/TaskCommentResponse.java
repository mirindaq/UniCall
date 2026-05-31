package iuh.fit.task_service.dtos.response;

import iuh.fit.task_service.entities.TaskComment;
import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.List;

@Value
@Builder
public class TaskCommentResponse {
    String id;
    String groupId;
    String taskId;
    String authorId;
    String content;
    List<TaskAttachmentResponse> attachments;
    Instant createdAt;
    Instant updatedAt;

    public static TaskCommentResponse from(TaskComment comment) {
        return TaskCommentResponse.builder()
                .id(comment.getId())
                .groupId(comment.getGroupId())
                .taskId(comment.getTaskId())
                .authorId(comment.getAuthorId())
                .content(comment.getContent())
                .attachments(comment.getAttachments() == null
                        ? List.of()
                        : comment.getAttachments().stream().map(TaskAttachmentResponse::from).toList())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}
