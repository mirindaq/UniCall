package iuh.fit.file_service.dtos.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
public class FileUploadRequest {

    @NotNull(message = "File không được để trống")
    private MultipartFile file;
}
