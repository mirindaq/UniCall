package iuh.fit.common_service.specification;

public enum SearchOperation {
    EQUALITY, NEGATION, GREATER_THAN, GREATER_THAN_EQUAL, LESS_THAN, LESS_THAN_EQUAL, LIKE, START_WITH, END_WITH;
    public static SearchOperation getOperation(char input) {
        return switch (input) {
            case '~' -> LIKE;
            case ':' -> EQUALITY;
            case '!' -> NEGATION;
            case '>' -> GREATER_THAN;
            case '}' -> GREATER_THAN_EQUAL;
            case '<' -> LESS_THAN;
            case '{' -> LESS_THAN_EQUAL;
            case '^' -> START_WITH;
            case '$' -> END_WITH;
            default -> null;
        };
    }
}
