package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.clients.GrpcFileServiceClient;
import iuh.fit.chat_service.dtos.response.FileUploadResponse;
import iuh.fit.chat_service.enums.AttachmentType;
import iuh.fit.chat_service.services.FileUploadService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileUploadServiceImpl implements FileUploadService {

    private final GrpcFileServiceClient grpcFileServiceClient;

    @Override
    public FileUploadResponse uploadFile(MultipartFile file) {
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

            var uploadResult = result.get();
            AttachmentType attachmentType = determineAttachmentType(contentType, originalFilename);

            return FileUploadResponse.builder()
                    .url(uploadResult.url())
                    .fileSize(uploadResult.fileSize())
                    .type(attachmentType)
                    .contentType(contentType)
                    .build();
        } catch (IOException e) {
            log.error("Error reading file content", e);
            throw new InvalidParamException("Không thể đọc nội dung file");
        }
    }

    private AttachmentType determineAttachmentType(String contentType, String filename) {
        // Phân loại theo Content-Type trước
        if (contentType != null && !contentType.isBlank()) {
            String lowerContentType = contentType.toLowerCase();
            
            if (lowerContentType.startsWith("image/")) {
                if (lowerContentType.contains("gif")) {
                    return AttachmentType.GIF;
                }
                return AttachmentType.IMAGE;
            }
            
            if (lowerContentType.startsWith("video/")) {
                return AttachmentType.VIDEO;
            }
            
            if (lowerContentType.startsWith("audio/")) {
                return AttachmentType.AUDIO;
            }
        }

        // Phân loại theo extension nếu content-type không rõ ràng
        if (filename != null && !filename.isBlank()) {
            String lowerFilename = filename.toLowerCase();
            
            // Image formats
            if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg") || 
                lowerFilename.endsWith(".png") || lowerFilename.endsWith(".webp") ||
                lowerFilename.endsWith(".bmp") || lowerFilename.endsWith(".svg")) {
                return AttachmentType.IMAGE;
            }
            
            // GIF
            if (lowerFilename.endsWith(".gif")) {
                return AttachmentType.GIF;
            }
            
            // Video formats
            if (lowerFilename.endsWith(".mp4") || lowerFilename.endsWith(".avi") ||
                lowerFilename.endsWith(".mov") || lowerFilename.endsWith(".wmv") ||
                lowerFilename.endsWith(".flv") || lowerFilename.endsWith(".mkv") ||
                lowerFilename.endsWith(".webm")) {
                return AttachmentType.VIDEO;
            }
            
            // Audio formats
            if (lowerFilename.endsWith(".mp3") || lowerFilename.endsWith(".wav") ||
                lowerFilename.endsWith(".ogg") || lowerFilename.endsWith(".m4a") ||
                lowerFilename.endsWith(".flac") || lowerFilename.endsWith(".aac")) {
                return AttachmentType.AUDIO;
            }
        }

        // Mặc định là FILE cho các loại khác (documents, archives, etc.)
        return AttachmentType.FILE;
    }
}
