package iuh.fit.task_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTaskGroupRequest {
    @NotBlank(message = "Group name is required")
    private String name;
    private String description;
}
