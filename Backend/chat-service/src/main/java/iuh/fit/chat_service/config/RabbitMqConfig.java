package iuh.fit.chat_service.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableRabbit
public class RabbitMqConfig {

    @Bean
    TopicExchange groupNotificationExchange(@Value("${app.notification.exchange}") String exchangeName) {
        return new TopicExchange(exchangeName, true, false);
    }

    @Bean
    JacksonJsonMessageConverter jacksonJsonMessageConverter() {
        return new JacksonJsonMessageConverter();
    }

    @Bean
    DirectExchange messageVectorIndexExchange(
            @Value("${app.ai-assistant.vector-search.rabbitmq.exchange}") String exchangeName
    ) {
        return new DirectExchange(exchangeName, true, false);
    }

    @Bean
    Queue messageVectorIndexQueue(
            @Value("${app.ai-assistant.vector-search.rabbitmq.queue}") String queueName
    ) {
        return new Queue(queueName, true);
    }

    @Bean
    Binding messageVectorIndexBinding(
            Queue messageVectorIndexQueue,
            DirectExchange messageVectorIndexExchange,
            @Value("${app.ai-assistant.vector-search.rabbitmq.routing-key}") String routingKey
    ) {
        return BindingBuilder.bind(messageVectorIndexQueue).to(messageVectorIndexExchange).with(routingKey);
    }
}
