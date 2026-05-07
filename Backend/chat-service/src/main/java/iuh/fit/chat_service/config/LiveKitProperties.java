package iuh.fit.chat_service.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.livekit")
public class LiveKitProperties {
    private boolean enabled = true;
    private String url = "ws://192.168.222.128:7880";
    private String apiKey = "devkey";
    private String apiSecret = "secret";
    private long tokenTtlSeconds = 3600;
}

