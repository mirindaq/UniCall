package iuh.fit.chat_service.services.impl;

import iuh.fit.chat_service.config.ContentModerationProperties;
import iuh.fit.chat_service.services.ChatContentModerationService;
import iuh.fit.common_service.exceptions.InvalidParamException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ChatContentModerationServiceImpl implements ChatContentModerationService {
    private static final Pattern NON_ALNUM_PATTERN = Pattern.compile("[^a-z0-9\\s]");
    private static final Pattern MULTIPLE_SPACE_PATTERN = Pattern.compile("\\s+");
    private final ContentModerationProperties properties;

    @Override
    public void validateOutgoingText(String text) {
        if (!properties.isEnabled() || !StringUtils.hasText(text)) {
            return;
        }

        String normalized = normalize(text);
        if (!StringUtils.hasText(normalized) || normalized.length() < properties.getMinTextLength()) {
            return;
        }

        if (containsAny(normalized, properties.getProfanityKeywords())
                || containsAny(normalized, properties.getSexualKeywords())) {
            if (properties.isBlockOnViolation()) {
                throw new InvalidParamException(properties.getBlockedMessage());
            }
        }
    }

    private static boolean containsAny(String normalizedText, List<String> keywords) {
        if (!StringUtils.hasText(normalizedText) || keywords == null || keywords.isEmpty()) {
            return false;
        }

        for (String keyword : keywords) {
            String normalizedKeyword = normalize(keyword);
            if (!StringUtils.hasText(normalizedKeyword)) {
                continue;
            }

            if (normalizedKeyword.contains(" ")) {
                if (normalizedText.contains(normalizedKeyword)) {
                    return true;
                }
                continue;
            }

            String regex = "(^|\\s)" + Pattern.quote(normalizedKeyword) + "(\\s|$)";
            if (Pattern.compile(regex).matcher(normalizedText).find()) {
                return true;
            }
        }
        return false;
    }

    private static String normalize(String value) {
        if (value == null) {
            return "";
        }

        String lowered = value.toLowerCase(Locale.ROOT)
                .replace('\u0111', 'd');

        StringBuilder decoded = new StringBuilder(lowered.length());
        for (char ch : lowered.toCharArray()) {
            decoded.append(decodeLeet(ch));
        }

        String noAccent = Normalizer.normalize(decoded.toString(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");

        return MULTIPLE_SPACE_PATTERN.matcher(
                        NON_ALNUM_PATTERN.matcher(noAccent).replaceAll(" ")
                )
                .replaceAll(" ")
                .trim();
    }

    private static char decodeLeet(char ch) {
        return switch (ch) {
            case '0' -> 'o';
            case '1' -> 'i';
            case '3' -> 'e';
            case '4' -> 'a';
            case '5' -> 's';
            case '7' -> 't';
            case '@' -> 'a';
            case '$' -> 's';
            case '!' -> 'i';
            default -> ch;
        };
    }
}
