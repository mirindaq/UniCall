package iuh.fit.common_service.observability;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnClass(RabbitTemplate.class)
public class TraceRabbitTemplatePostProcessor implements BeanPostProcessor {

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof RabbitTemplate rabbitTemplate) {
            rabbitTemplate.addBeforePublishPostProcessors(this::addTraceHeader);
        }
        return bean;
    }

    private Message addTraceHeader(Message message) {
        String traceId = TraceContext.currentOrCreateTraceId();
        message.getMessageProperties().setHeader(TraceContext.RABBIT_HEADER, traceId);
        message.getMessageProperties().setCorrelationId(traceId);
        return message;
    }
}
