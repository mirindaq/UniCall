package iuh.fit.identity_service.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import iuh.fit.common_service.exceptions.InvalidParamException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {
    @Value("${app.firebase.enabled:false}")
    private boolean firebaseEnabled;

    @Value("${app.firebase.credentials-path:classpath:unicall-dddf4-firebase-adminsdk-fbsvc-7b9c486043.json}")
    private String firebaseCredentialsPath;

    @PostConstruct
    public void initializeFirebase() {
        if (!firebaseEnabled || !FirebaseApp.getApps().isEmpty()) {
            return;
        }
        if (firebaseCredentialsPath == null || firebaseCredentialsPath.isBlank()) {
            throw new InvalidParamException("Firebase credentials path is required when Firebase OTP is enabled");
        }

        try (InputStream serviceAccount = openCredentialsStream(firebaseCredentialsPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();
            FirebaseApp.initializeApp(options);
        } catch (IOException exception) {
            throw new InvalidParamException("Cannot initialize Firebase Admin SDK: " + exception.getMessage());
        }
    }

    private InputStream openCredentialsStream(String path) throws IOException {
        if (path.startsWith("classpath:")) {
            String classpathLocation = path.substring("classpath:".length());
            if (classpathLocation.startsWith("/")) {
                classpathLocation = classpathLocation.substring(1);
            }
            Resource resource = new ClassPathResource(classpathLocation);
            if (!resource.exists()) {
                throw new IOException("Classpath resource not found: " + classpathLocation);
            }
            return resource.getInputStream();
        }
        return new FileInputStream(path);
    }
}
