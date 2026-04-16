package iuh.fit.chat_service.services;

import iuh.fit.chat_service.dtos.response.FileUploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface FileUploadService {
    FileUploadResponse uploadFile(MultipartFile file);
}
