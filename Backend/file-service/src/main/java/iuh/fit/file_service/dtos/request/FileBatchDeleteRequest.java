package iuh.fit.file_service.dtos.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class FileBatchDeleteRequest {

    @NotEmpty(message = "Danh sách URL không được để trống")
    private List<String> urls;
}
