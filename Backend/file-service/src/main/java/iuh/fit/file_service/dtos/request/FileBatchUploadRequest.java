package iuh.fit.file_service.dtos.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@Setter
public class FileBatchUploadRequest {

    @NotEmpty(message = "Danh sách file không được để trống")
    private List<MultipartFile> files;
}
