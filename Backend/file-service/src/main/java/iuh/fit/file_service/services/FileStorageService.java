package iuh.fit.file_service.services;

import iuh.fit.file_service.dtos.response.FileUploadResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface FileStorageService {

    FileUploadResponse upload(MultipartFile file);

    List<FileUploadResponse> uploadAll(List<MultipartFile> files);

    void deleteByUrl(String url);

    void deleteAllByUrls(List<String> urls);
}
