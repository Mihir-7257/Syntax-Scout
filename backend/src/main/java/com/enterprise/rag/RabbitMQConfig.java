package com.enterprise.rag;

import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String INGESTION_QUEUE = "repo.ingestion.queue";

    @Bean
    public Queue ingestionQueue() {
        return new Queue(INGESTION_QUEUE, true);
    }
}
