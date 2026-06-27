package com.codeforge.execution.shared.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String SUBMISSION_QUEUE = "submission.queue";
    public static final String SUBMISSION_DLQ = "submission.dlq";
    public static final String EXCHANGE = "submission.exchange";
    public static final String ROUTING_KEY = "submission.route";
    public static final String DLQ_ROUTING_KEY = "submission.dlq.route";

    @Bean
    public DirectExchange submissionExchange() {
        return new DirectExchange(EXCHANGE);
    }

    @Bean
    public Queue submissionQueue() {
        return QueueBuilder.durable(SUBMISSION_QUEUE)
                .withArgument("x-dead-letter-exchange", EXCHANGE)
                .withArgument("x-dead-letter-routing-key", DLQ_ROUTING_KEY)
                .build();
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(SUBMISSION_DLQ).build();
    }

    @Bean
    public Binding submissionBinding(Queue submissionQueue, DirectExchange submissionExchange) {
        return BindingBuilder.bind(submissionQueue).to(submissionExchange).with(ROUTING_KEY);
    }

    @Bean
    public Binding dlqBinding(Queue deadLetterQueue, DirectExchange submissionExchange) {
        return BindingBuilder.bind(deadLetterQueue).to(submissionExchange).with(DLQ_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}
