package iuh.fit.chat_service.enums;

import org.springframework.util.StringUtils;

import java.util.Locale;

public enum AiThreadScope {
    CURRENT_CONVERSATION,
    SELECTED_CONVERSATIONS,
    MY_ALL_CONVERSATIONS;

    public static AiThreadScope fromNullable(String raw) {
        if (!StringUtils.hasText(raw)) {
            return CURRENT_CONVERSATION;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        for (AiThreadScope value : values()) {
            if (value.name().equals(normalized)) {
                return value;
            }
        }
        return CURRENT_CONVERSATION;
    }
}
