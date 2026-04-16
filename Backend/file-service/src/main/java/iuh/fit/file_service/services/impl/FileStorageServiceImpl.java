package iuh.fit.file_service.services.impl;

import iuh.fit.common_service.exceptions.InvalidFileTypeException;
import iuh.fit.common_service.exceptions.InvalidParamException;
import iuh.fit.file_service.config.AwsS3Properties;
import iuh.fit.file_service.dtos.response.FileUploadResponse;
import iuh.fit.file_service.services.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileStorageServiceImpl implements FileStorageService {

    private final S3Client s3Client;
    private final AwsS3Properties props;

    @Override
    public FileUploadResponse upload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidParamException("File không được để trống");
        }
        String contentType = resolveValidatedContentType(file);

        String key = buildObjectKey(file.getOriginalFilename());
        putMultipartObject(key, contentType, file);

        return FileUploadResponse.builder()
                .url(buildPublicUrl(key))
                .build();
    }

    @Override
    public FileUploadResponse uploadBytes(String originalFilename, String contentType, byte[] content) {
        if (content == null || content.length == 0) {
            throw new InvalidParamException("File không được để trống");
        }
        String validatedContentType = resolveValidatedContentType(originalFilename, contentType);

        String key = buildObjectKey(originalFilename);
        putByteArrayObject(key, validatedContentType, content);

        return FileUploadResponse.builder()
                .url(buildPublicUrl(key))
                .build();
    }

    @Override
    public List<FileUploadResponse> uploadAll(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new InvalidParamException("Danh sách file không được để trống");
        }
        List<FileUploadResponse> results = new ArrayList<>(files.size());
        for (MultipartFile file : files) {
            if (file != null && !file.isEmpty()) {
                results.add(upload(file));
            }
        }
        if (results.isEmpty()) {
            throw new InvalidParamException("Không có file hợp lệ để tải lên");
        }
        return results;
    }

    private String resolveValidatedContentType(MultipartFile file) {
        return resolveValidatedContentType(file.getOriginalFilename(), file.getContentType());
    }

    private String resolveValidatedContentType(String originalFilename, String declaredContentType) {
        String normalized = normalizeMimeType(declaredContentType);
        if (StringUtils.hasText(normalized) && props.allowedMimeTypes().contains(normalized)) {
            return normalized;
        }
        String fromName = guessContentTypeFromFilename(originalFilename);
        if (fromName != null) {
            return fromName;
        }
        throw new InvalidFileTypeException("Định dạng file không được hỗ trợ");
    }

    private String guessContentTypeFromFilename(String originalFilename) {
        if (!StringUtils.hasText(originalFilename)) {
            return null;
        }
        String base = Paths.get(originalFilename).getFileName().toString();
        int dot = base.lastIndexOf('.');
        if (dot < 0 || dot == base.length() - 1) {
            return null;
        }
        String ext = base.substring(dot + 1).toLowerCase(Locale.ROOT);
        return props.getExtensionToMime().get(ext);
    }

    private static String normalizeMimeType(String contentType) {
        if (!StringUtils.hasText(contentType)) {
            return null;
        }
        String normalized = contentType.trim().toLowerCase(Locale.ROOT);
        int semicolon = normalized.indexOf(';');
        if (semicolon >= 0) {
            normalized = normalized.substring(0, semicolon).trim();
        }
        return normalized;
    }

    @Override
    public void deleteByUrl(String url) {
        if (!StringUtils.hasText(url)) {
            throw new InvalidParamException("URL không được để trống");
        }
        String key = extractKeyFromUrl(url.trim());
        deleteObject(key);
    }

    @Override
    public void deleteAllByUrls(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            throw new InvalidParamException("Danh sách URL không được để trống");
        }
        for (String url : urls) {
            if (!StringUtils.hasText(url)) {
                throw new InvalidParamException("URL không được để trống");
            }
            deleteByUrl(url.trim());
        }
    }

    private String extractKeyFromUrl(String urlString) {
        URI uri;
        try {
            uri = URI.create(urlString);
        } catch (IllegalArgumentException e) {
            throw new InvalidParamException("URL không hợp lệ");
        }
        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            throw new InvalidParamException("URL không hợp lệ");
        }
        String rawPath = uri.getRawPath();
        if (!StringUtils.hasText(rawPath) || "/".equals(rawPath)) {
            throw new InvalidParamException("URL không chứa đường dẫn object");
        }
        String path = rawPath.startsWith("/") ? rawPath.substring(1) : rawPath;
        String key = UriUtils.decode(path, StandardCharsets.UTF_8);
        validateObjectKey(key);
        return key;
    }

    private static void validateObjectKey(String key) {
        if (!StringUtils.hasText(key)) {
            throw new InvalidParamException("Key object không hợp lệ");
        }
        if (key.contains("..") || key.startsWith("/") || key.contains("\\")) {
            throw new InvalidParamException("Key object không hợp lệ");
        }
    }

    private void deleteObject(String key) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(props.getBucket())
                .key(key)
                .build());
    }

    private void putMultipartObject(String key, String contentType, MultipartFile file) {
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(props.getBucket())
                    .key(key)
                    .contentType(contentType)
                    .contentLength(file.getSize())
                    .build();
            s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException e) {
            throw new InvalidParamException("Không đọc được nội dung file");
        }
    }

    private void putByteArrayObject(String key, String contentType, byte[] content) {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(props.getBucket())
                .key(key)
                .contentType(contentType)
                .contentLength((long) content.length)
                .build();
        s3Client.putObject(request, RequestBody.fromBytes(content));
    }

    private String buildObjectKey(String originalFilename) {
        return UUID.randomUUID() + "-" + safeFileName(originalFilename);
    }

    private static String safeFileName(String name) {
        if (!StringUtils.hasText(name)) {
            return "avatar";
        }
        String base = Paths.get(name).getFileName().toString();
        if (!StringUtils.hasText(base) || base.contains("..")) {
            throw new InvalidParamException("Tên file không hợp lệ");
        }
        return base.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String buildPublicUrl(String key) {
        String encodedKey = UriUtils.encodePath(key, StandardCharsets.UTF_8);
        return "https://%s.s3.%s.amazonaws.com/%s".formatted(
                props.getBucket(), props.getRegion(), encodedKey);
    }
}
