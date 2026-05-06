package iuh.fit.chat_service.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.content-moderation")
public class ContentModerationProperties {
    private boolean enabled = true;
    private boolean blockOnViolation = true;
    private int minTextLength = 2;
    private String blockedMessage = "Tin nhắn chứa nội dung không phù hợp (tục tĩu/18+). Vui lòng điều chỉnh trước khi gửi.";

    private List<String> profanityKeywords = new ArrayList<>(List.of(
            "dit",
            "dit me",
            "ditme",
            "dmm",
            "dcm",
            "cac",
            "cc",
            "vcl",
            "vl",
            "fuck",
            "fucking",
            "shit"
    ));

    private List<String> sexualKeywords = new ArrayList<>(List.of(
            "sex",
            "porn",
            "jav",
            "18+",
            "khoa than",
            "nhay cam",
            "nguoi lon"
    ));
}

