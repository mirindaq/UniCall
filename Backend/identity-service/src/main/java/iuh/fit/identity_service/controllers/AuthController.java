package iuh.fit.identity_service.controllers;

import iuh.fit.common_service.dtos.response.base.ResponseSuccess;
import iuh.fit.identity_service.dtos.request.auth.RegisterRequest;
import iuh.fit.identity_service.dtos.response.auth.AccessTokenResponse;
import iuh.fit.identity_service.dtos.response.auth.RegisterResponse;
import iuh.fit.identity_service.services.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("${api.prefix:/api/v1}/auth")
@RequiredArgsConstructor
public class AuthController {
    private static final String STATE_COOKIE_NAME = "unicall_oauth_state";
    private static final String VERIFIER_COOKIE_NAME = "unicall_oauth_verifier";
    private static final String REFRESH_COOKIE_NAME = "unicall_rt";

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ResponseSuccess<RegisterResponse>> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse data = authService.register(request);
        return new ResponseEntity<>(
                new ResponseSuccess<>(HttpStatus.CREATED, "Register success", data),
                HttpStatus.CREATED
        );
    }

    @GetMapping("/login")
    public ResponseEntity<Void> login() {
        AuthService.LoginResult result = authService.login();
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, result.stateCookie().toString());
        headers.add(HttpHeaders.SET_COOKIE, result.verifierCookie().toString());
        headers.setLocation(java.net.URI.create(result.authorizationUrl()));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam("code") String code,
            @RequestParam("state") String state,
            @CookieValue(value = STATE_COOKIE_NAME, required = false) String stateInCookie,
            @CookieValue(value = VERIFIER_COOKIE_NAME, required = false) String verifierInCookie
    ) {
        AuthService.CallbackResult result = authService.callback(code, state, stateInCookie, verifierInCookie);
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, result.refreshCookie().toString());
        headers.add(HttpHeaders.SET_COOKIE, result.clearStateCookie().toString());
        headers.add(HttpHeaders.SET_COOKIE, result.clearVerifierCookie().toString());
        headers.setLocation(java.net.URI.create(result.redirectUrl()));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @PostMapping("/refresh")
    public ResponseEntity<ResponseSuccess<AccessTokenResponse>> refresh(
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String refreshToken
    ) {
        AuthService.RefreshResult result = authService.refresh(refreshToken);
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, result.refreshCookie().toString());
        return new ResponseEntity<>(
                new ResponseSuccess<>(HttpStatus.OK, "Refresh token success", result.accessTokenResponse()),
                headers,
                HttpStatus.OK
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<ResponseSuccess<Void>> logout(
            @CookieValue(value = REFRESH_COOKIE_NAME, required = false) String refreshToken,
            HttpServletRequest request
    ) {
        AuthService.LogoutResult result = authService.logout(refreshToken, request);
        HttpHeaders headers = new HttpHeaders();
        result.clearCookies().forEach(cookie -> headers.add(HttpHeaders.SET_COOKIE, cookie.toString()));
        return new ResponseEntity<>(
                new ResponseSuccess<>(HttpStatus.OK, "Logout success"),
                headers,
                HttpStatus.OK
        );
    }
}
