package iuh.fit.file_service.dtos.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FileUploadResponse {
    private final String url;
}
