package com.enterprise.rag.controller;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.QuestionAnswerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatClient chatClient;

    @Autowired
    public ChatController(ChatClient.Builder chatClientBuilder, VectorStore vectorStore, ChatMemory chatMemory) {
        this.chatClient = chatClientBuilder
                .defaultAdvisors(
                        new MessageChatMemoryAdvisor(chatMemory),
                        new QuestionAnswerAdvisor(vectorStore, SearchRequest.defaults().withTopK(5).withSimilarityThresholdAll())
                )
                .build();
    }

    private String buildSystemPrompt(String expertiseLevel, String actionType) {
        StringBuilder prompt = new StringBuilder("You are an expert software architect answering questions about a codebase.\n");
        prompt.append("Use the provided code snippets as context to answer the user's question.\n");

        // Action Type Handling
        if ("SECURITY".equalsIgnoreCase(actionType)) {
            prompt.append("Perform a comprehensive OWASP Top 10 security audit on the provided code. Identify vulnerabilities, SQL injections, hardcoded secrets, or memory leaks, and generate a Security Report.\n");
        } else if ("DIAGRAM".equalsIgnoreCase(actionType)) {
            prompt.append("Analyze the provided code and generate a Mermaid.js flowchart representing the architecture and relationships of the classes/methods. ONLY output valid Mermaid syntax starting with ```mermaid and no other text.\n");
        } else if ("AUTOCODE".equalsIgnoreCase(actionType)) {
            prompt.append("The user wants to add a new feature. Generate the exact, production-ready Java code needed to implement the requested feature. Strictly match the architectural style, naming conventions, and patterns of the provided codebase context.\n");
        } else {
            prompt.append("Even if the snippets don't contain the exact answer, try to provide a helpful response based on your general programming knowledge, but prioritize the provided codebase context.\n");
        }

        // Expertise Level Handling
        if ("BEGINNER".equalsIgnoreCase(expertiseLevel)) {
            prompt.append("\nCRITICAL: The user is a beginner. Explain concepts using extremely simple, real-world analogies (like a restaurant, post office, etc). Avoid complex technical jargon.\n");
        } else if ("SENIOR".equalsIgnoreCase(expertiseLevel)) {
            prompt.append("\nCRITICAL: The user is a Senior Staff Engineer. Provide a highly technical explanation focusing on time complexity (Big-O), memory allocation, concurrency risks, and system design trade-offs.\n");
        }

        return prompt.toString();
    }

    @PostMapping("/chat")
    public String chat(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        String conversationId = request.getOrDefault("conversationId", "default");
        String expertiseLevel = request.getOrDefault("expertiseLevel", "INTERMEDIATE");
        String actionType = request.getOrDefault("actionType", "CHAT");
        
        if (query == null || query.isEmpty()) {
            return "Query is required";
        }

        return chatClient.prompt()
                .system(buildSystemPrompt(expertiseLevel, actionType))
                .user(query)
                .advisors(a -> a
                        .param(MessageChatMemoryAdvisor.CHAT_MEMORY_CONVERSATION_ID_KEY, conversationId)
                        .param(MessageChatMemoryAdvisor.CHAT_MEMORY_RETRIEVE_SIZE_KEY, 10))
                .call()
                .content();
    }
}
