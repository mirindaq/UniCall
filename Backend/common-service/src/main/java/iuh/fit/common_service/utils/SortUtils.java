package iuh.fit.common_service.utils;

import org.springframework.data.domain.Sort;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static iuh.fit.common_service.constants.SortConstants.SORT_BY_PATTERN;


public class SortUtils {
    public static Sort parseSort(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return Sort.unsorted();
        }

        Pattern pattern = Pattern.compile(SORT_BY_PATTERN);
        Matcher matcher = pattern.matcher(sortBy);
        if (matcher.find()) {
            String field = matcher.group(1);
            String direction = matcher.group(3).toUpperCase();
            return direction.equals("ASC")
                    ? Sort.by(field).ascending()
                    : Sort.by(field).descending();
        }

        return Sort.unsorted();
    }
}
