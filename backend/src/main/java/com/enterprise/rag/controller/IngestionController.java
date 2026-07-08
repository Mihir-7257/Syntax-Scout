package com.enterprise.rag.controller;

import com.enterprise.rag.RabbitMQConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // For development with Vite
public class IngestionController {

    private final RabbitTemplate rabbitTemplate;

    @Autowired
    public IngestionController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @PostMapping("/ingest")
    public ResponseEntity<Map<String, String>> ingestRepository(@RequestBody Map<String, String> request) {
        String repoUrl = request.get("url");
        if (repoUrl == null || repoUrl.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "URL is required"));
        }

        String jobId = UUID.randomUUID().toString();
        
        // Prepare message payload for the Python worker
        try {
            Map<String, String> messageMap = new HashMap<>();
            messageMap.put("job_id", jobId);
            messageMap.put("repo_url", repoUrl);
            String message = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(messageMap);
            rabbitTemplate.convertAndSend(RabbitMQConfig.INGESTION_QUEUE, message);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to queue job"));
        }

        return ResponseEntity.ok(Map.of("jobId", jobId, "status", "Ingestion job submitted successfully"));
    }
}
