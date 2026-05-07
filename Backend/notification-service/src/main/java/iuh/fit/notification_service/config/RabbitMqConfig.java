package iuh.fit.notification_service.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    @Bean
    TopicExchange notificationExchange(@Value("${app.notification.exchange}") String exchangeName) {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    Queue notificationQueue(@Value("${app.notification.queue}") String queueName) {
        return new Queue(queueName, true);
    }

    @Bean
    Binding notificationBinding(
            Queue notificationQueue,
            TopicExchange notificationExchange,
            @Value("${app.notification.routing-key-pattern}") String routingKeyPattern) {
        return BindingBuilder.bind(notificationQueue).to(notificationExchange).with(routingKeyPattern);
    }

    @Bean
    JacksonJsonMessageConverter jacksonJsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
