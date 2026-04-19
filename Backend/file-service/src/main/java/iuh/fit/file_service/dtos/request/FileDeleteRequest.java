package iuh.fit.file_service.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FileDeleteRequest {

    @NotBlank(message = "URL không được để trống")
    private String url;
}
