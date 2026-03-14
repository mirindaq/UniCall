package iuh.fit.common_service.utils;


import iuh.fit.common_service.exceptions.InvalidParamException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public class DateUtils {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    public static String formatDate(LocalDate date) {
        if (date == null) {
            return "";
        }
        return date.format(FORMATTER);
    }


    public static LocalDate convertStringToLocalDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            throw new InvalidParamException("Date string cannot be null or blank");
        }
        try {
            return LocalDate.parse(dateStr, FORMATTER);
        } catch (DateTimeParseException e) {
            throw new InvalidParamException("Invalid date format. Expected format: dd/MM/yyyy");
        }
    }


    public static String formatLocalDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "";
        }
        return dateTime.format(DATE_TIME_FORMATTER);
    }

    public static LocalDateTime convertStringToLocalDateTime(String dateTimeStr) {
        if (dateTimeStr == null || dateTimeStr.isBlank()) {
            throw new InvalidParamException("DateTime string cannot be null or blank");
        }
        try {
            return LocalDateTime.parse(dateTimeStr, DATE_TIME_FORMATTER);
        } catch (DateTimeParseException e) {
            throw new InvalidParamException("Invalid date time format. Expected format: HH:mm dd/MM/yyyy");
        }
    }
}
