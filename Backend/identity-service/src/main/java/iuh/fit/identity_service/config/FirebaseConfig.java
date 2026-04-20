package iuh.fit.identity_service.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import iuh.fit.common_service.exceptions.InvalidParamException;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {
    @Value("${app.firebase.enabled:false}")
    private boolean firebaseEnabled;

    @Value("${app.firebase.credentials-path:}")
    private String firebaseCredentialsPath;

    @PostConstruct
    public void initializeFirebase() {
        if (!firebaseEnabled || !FirebaseApp.getApps().isEmpty()) {
            return;
        }
        if (firebaseCredentialsPath == null || firebaseCredentialsPath.isBlank()) {
            throw new InvalidParamException("Firebase credentials path is required when Firebase OTP is enabled");
        }

        try (InputStream serviceAccount = new FileInputStream(firebaseCredentialsPath)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();
            FirebaseApp.initializeApp(options);
        } catch (IOException exception) {
            throw new InvalidParamException("Cannot initialize Firebase Admin SDK: " + exception.getMessage());
        }
    }
}
