package iuh.fit.file_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.file_service.dtos.request.FileBatchDeleteRequest;
import iuh.fit.file_service.dtos.request.FileBatchUploadRequest;
import iuh.fit.file_service.dtos.request.FileDeleteRequest;
import iuh.fit.file_service.dtos.request.FileUploadRequest;
import iuh.fit.file_service.dtos.response.FileUploadResponse;
import iuh.fit.file_service.services.FileStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseSuccess<FileUploadResponse>> upload(
            @Valid @ModelAttribute FileUploadRequest request) {
        FileUploadResponse data = fileStorageService.upload(request.getFile());
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Tải file lên thành công", data));
    }

    @PostMapping(value = "/upload/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseSuccess<List<FileUploadResponse>>> uploadBatch(
            @Valid @ModelAttribute FileBatchUploadRequest request) {
        List<FileUploadResponse> data = fileStorageService.uploadAll(request.getFiles());
        return ResponseEntity.ok(
                new ResponseSuccess<>(HttpStatus.OK, "Tải danh sách file lên thành công", data));
    }

    @DeleteMapping
    public ResponseEntity<ResponseSuccess<Void>> delete(@Valid @RequestBody FileDeleteRequest request) {
        fileStorageService.deleteByUrl(request.getUrl());
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Xóa file thành công"));
    }

    @DeleteMapping("/batch")
    public ResponseEntity<ResponseSuccess<Void>> deleteBatch(@Valid @RequestBody FileBatchDeleteRequest request) {
        fileStorageService.deleteAllByUrls(request.getUrls());
        return ResponseEntity.ok(new ResponseSuccess<>(HttpStatus.OK, "Xóa danh sách file thành công"));
    }
}
