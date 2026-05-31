FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY common-service ./common-service
COPY proto-common ./proto-common
COPY file-service ./file-service

RUN mvn -f common-service/pom.xml -DskipTests install && \
    mvn -f proto-common/pom.xml -DskipTests install && \
    mvn -f file-service/pom.xml -DskipTests package

RUN JAR_PATH=$(find /workspace/file-service/target -maxdepth 1 -name "*.jar" ! -name "*.original" | head -n 1) && \
    cp "$JAR_PATH" /workspace/app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/app.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]