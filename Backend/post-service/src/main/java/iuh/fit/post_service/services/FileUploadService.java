package iuh.fit.post_service.services;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.post_service.clients.GrpcFileServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileUploadService {

    private final GrpcFileServiceClient grpcFileServiceClient;

    /**
     * Upload a single file to file-service via gRPC
     */
    public String uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidParamException("File không được để trống");
        }

        String originalFilename = file.getOriginalFilename();
        String contentType = file.getContentType();
        
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new InvalidParamException("Tên file không hợp lệ");
        }

        if (contentType == null || contentType.isBlank()) {
            throw new InvalidParamException("Content type không hợp lệ");
        }

        try {
            byte[] content = file.getBytes();
            var result = grpcFileServiceClient.uploadFile(originalFilename, contentType, content);
            
            if (result.isEmpty()) {
                throw new InvalidParamException("Upload file thất bại");
            }

            log.info("File uploaded successfully: {} (size: {} bytes)", 
                    result.get().url(), result.get().fileSize());
            return result.get().url();
        } catch (IOException e) {
            log.error("Error reading file content", e);
            throw new InvalidParamException("Không thể đọc nội dung file");
        }
    }

    /**
     * Upload multiple files to file-service via gRPC
     */
    public List<String> uploadFiles(List<MultipartFile> files) {
        List<String> urls = new ArrayList<>();
        
        for (MultipartFile file : files) {
            if (!file.isEmpty()) {
                String url = uploadFile(file);
                urls.add(url);
            }
        }
        
        return urls;
    }

    /**
     * Validate file type for posts (images and videos)
     */
    public boolean isValidMediaFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) {
            return false;
        }
        
        return contentType.startsWith("image/") || contentType.startsWith("video/");
    }
}
