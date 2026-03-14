package iuh.fit.common_service.specification;

import iuh.fit.common_service.utils.DateUtils;
import jakarta.persistence.criteria.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class EntitySpecification<T> implements Specification<T> {
    private SpecSearchCriteria criteria;

    @Override
    public Predicate toPredicate(@NonNull Root<T> root,
                                 @NonNull CriteriaQuery<?> query,
                                 @NonNull CriteriaBuilder builder) {
        Path<?> path = getPath(root, criteria.getKey());
        return switch (criteria.getOperation()) {
            case EQUALITY -> {
                if (criteria.getValue() == null) {
                    yield builder.isNull(path);
                }

                Class<?> type = path.getJavaType();
                if (type.equals(String.class)) {
                    yield builder.equal(path, criteria.getValue());
                } else if (type.equals(Long.class) || type.equals(long.class)) {
                    yield builder.equal(path.as(Long.class), Long.parseLong(criteria.getValue().toString()));
                } else if (type.equals(Boolean.class) || type.equals(boolean.class)) {
                    yield builder.equal(path, Boolean.parseBoolean(criteria.getValue().toString()));
                } else if (type.equals(LocalDate.class)) {
                    yield builder.equal(path.as(LocalDate.class), DateUtils.convertStringToLocalDate(criteria.getValue().toString()));
                } else if (type.isEnum()) {
                    @SuppressWarnings({"unchecked", "rawtypes"})
                    Enum enumVal = Enum.valueOf((Class<Enum>) type, criteria.getValue().toString());
                    yield builder.equal(path, enumVal);
                } else {
                    yield builder.equal(path, criteria.getValue());
                }
            }
            case NEGATION -> {
                if (criteria.getValue() == null) {
                    yield builder.isNotNull(path);
                } else {
                    Class<?> negType = path.getJavaType();
                    if (negType.isEnum()) {
                        @SuppressWarnings({"unchecked", "rawtypes"})
                        Enum enumVal = Enum.valueOf((Class<Enum>) negType, criteria.getValue().toString());
                        yield builder.notEqual(path, enumVal);
                    } else {
                        yield builder.notEqual(path, criteria.getValue());
                    }
                }
            }

            case GREATER_THAN -> {
                if (path.getJavaType().equals(LocalDate.class)) {
                    yield builder.greaterThan(
                            path.as(LocalDate.class),
                            DateUtils.convertStringToLocalDate(criteria.getValue().toString())
                    );
                } else if(path.getJavaType().equals(LocalDateTime.class)){
                    yield builder.greaterThan(
                            path.as(LocalDateTime.class),
                            DateUtils.convertStringToLocalDateTime(criteria.getValue().toString())
                    );
                }
                else {
                    yield builder.greaterThan(path.as(String.class), criteria.getValue().toString());
                }
            }

            case GREATER_THAN_EQUAL -> {
                if (path.getJavaType().equals(LocalDate.class)) {
                    yield builder.greaterThanOrEqualTo(
                            path.as(LocalDate.class),
                            DateUtils.convertStringToLocalDate(criteria.getValue().toString())
                    );
                } else if(path.getJavaType().equals(LocalDateTime.class)){
                    yield builder.greaterThanOrEqualTo(
                            path.as(LocalDateTime.class),
                            DateUtils.convertStringToLocalDateTime(criteria.getValue().toString())
                    );
                } else {
                    yield builder.greaterThanOrEqualTo(path.as(String.class), criteria.getValue().toString());
                }
            }

            case LESS_THAN -> {
                if (path.getJavaType().equals(LocalDate.class)) {
                    yield builder.lessThan(
                            path.as(LocalDate.class),
                            DateUtils.convertStringToLocalDate(criteria.getValue().toString())
                    );
                } else if(path.getJavaType().equals(LocalDateTime.class)){
                    yield builder.lessThan(
                            path.as(LocalDateTime.class),
                            DateUtils.convertStringToLocalDateTime(criteria.getValue().toString())
                    );
                } else {
                    yield builder.lessThan(path.as(String.class), criteria.getValue().toString());
                }
            }

            case LESS_THAN_EQUAL -> {
                if (path.getJavaType().equals(LocalDate.class)) {
                    yield builder.lessThanOrEqualTo(
                            path.as(LocalDate.class),
                            DateUtils.convertStringToLocalDate(criteria.getValue().toString())
                    );
                } else if(path.getJavaType().equals(LocalDateTime.class)){
                    yield builder.lessThanOrEqualTo(
                            path.as(LocalDateTime.class),
                            DateUtils.convertStringToLocalDateTime(criteria.getValue().toString())
                    );
                } else {
                    yield builder.lessThanOrEqualTo(path.as(String.class), criteria.getValue().toString());
                }
            }

            case LIKE -> builder.like(
                    builder.lower(path.as(String.class)),
                    "%" + criteria.getValue().toString().toLowerCase() + "%"
            );

            case START_WITH -> builder.like(
                    builder.lower(path.as(String.class)),
                    criteria.getValue().toString().toLowerCase() + "%"
            );

            case END_WITH -> builder.like(
                    builder.lower(path.as(String.class)),
                    "%" + criteria.getValue().toString().toLowerCase()
            );
        };
    }

    private Path<?> getPath(Root<T> root, String key) {
        if (key.contains(".")) {
            String[] parts = key.split("\\.");
            Path<?> path = root;
            for (String part : parts) {
                path = path.get(part);
            }
            return path;
        }
        return root.get(key);
    }
}
