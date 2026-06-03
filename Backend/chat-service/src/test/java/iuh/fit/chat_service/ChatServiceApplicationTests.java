package iuh.fit.chat_service;

import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.EnableCaching;

import static org.assertj.core.api.Assertions.assertThat;

class ChatServiceApplicationTests {

	@Test
	void applicationEnablesCaching() {
		assertThat(ChatServiceApplication.class.isAnnotationPresent(EnableCaching.class)).isTrue();
	}

}
