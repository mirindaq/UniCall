package iuh.fit.task_service.dtos.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class ReorderTaskColumnsRequest {
    @NotEmpty(message = "Column order is required")
    private List<String> columnIds;
}
