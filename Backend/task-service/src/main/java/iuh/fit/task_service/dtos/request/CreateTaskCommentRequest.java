package iuh.fit.task_service.dtos.request;

import lombok.Data;

import java.util.List;

@Data
public class CreateTaskCommentRequest {
    private String content;
    private List<TaskAttachmentRequest> attachments;
}
