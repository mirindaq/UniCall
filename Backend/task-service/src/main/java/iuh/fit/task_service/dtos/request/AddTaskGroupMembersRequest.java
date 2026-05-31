package iuh.fit.task_service.dtos.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.Set;

@Data
public class AddTaskGroupMembersRequest {
    @NotEmpty(message = "Member IDs are required")
    private Set<String> memberIds;
}
