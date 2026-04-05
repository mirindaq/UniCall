package iuh.fit.file_service.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
@ConfigurationProperties(prefix = "aws.s3")
public class AwsS3Properties {

    private String region;
    private String bucket;
    private String accessKey;
    private String secretKey;

    private Map<String, String> extensionToMime = defaultExtensionToMime();

    private static Map<String, String> defaultExtensionToMime() {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("jpg", "image/jpeg");
        m.put("jpeg", "image/jpeg");
        m.put("png", "image/png");
        m.put("gif", "image/gif");
        m.put("webp", "image/webp");
        m.put("pdf", "application/pdf");
        m.put("doc", "application/msword");
        m.put("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        m.put("xls", "application/vnd.ms-excel");
        m.put("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        m.put("xlsm", "application/vnd.ms-excel.sheet.macroEnabled.12");
        m.put("csv", "text/csv");
        m.put("ppt", "application/vnd.ms-powerpoint");
        m.put("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        return m;
    }

    public Set<String> allowedMimeTypes() {
        return Set.copyOf(extensionToMime.values());
    }
}
