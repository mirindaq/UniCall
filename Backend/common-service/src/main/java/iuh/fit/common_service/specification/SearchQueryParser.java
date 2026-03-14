package iuh.fit.common_service.specification;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static iuh.fit.common_service.constants.QueryConstants.*;


public class SearchQueryParser {
    public static <T> SpecificationBuildQuery<T> parse(String search) {
        SpecificationBuildQuery<T> builder = new SpecificationBuildQuery<>();

        if (search == null || search.isBlank()) return builder;
        Pattern pattern = Pattern.compile(SEARCH_OPERATOR_PATTERN);

        String[] andParts = search.split(SEARCH_AND_OPERATOR);
        for (String part : andParts) {
            String[] orParts = part.split(SEARCH_OR_OPERATOR);
            boolean isOr = false;

            for (String s : orParts) {
                Matcher matcher = pattern.matcher(s.trim());
                if (matcher.find()) {
                    String key = matcher.group(1);
                    String operator = matcher.group(2);
                    String value = matcher.group(3);

                    builder.with(isOr ? SEARCH_OR_OPERATOR : SEARCH_AND_OPERATOR,
                            key, operator, value);
                }
                isOr = true;
            }
        }

        return builder;
    }
}
