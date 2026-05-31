package iuh.fit.task_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTaskColumnRequest {
    @NotBlank(message = "Column name is required")
    private String name;
}
