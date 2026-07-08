# Syntax Scout

Syntax Scout is an asynchronous Retrieval-Augmented Generation (RAG) tool that allows developers to ingest GitHub repositories and interactively query the codebase. 

Instead of relying on naive character-based text chunking, this project uses a custom Python worker powered by **Tree-sitter** to parse the Abstract Syntax Tree (AST) of the repository. This ensures that vector embeddings are generated intelligently by extracting complete, logically sound methods and classes.

## Features

- **AST Code Parsing:** Uses 	ree-sitter to break down repositories into semantically meaningful chunks (methods/classes).
- **Asynchronous Processing:** Heavy machine learning tasks (cloning, parsing, and embedding generation) are completely decoupled from the main API using a **RabbitMQ** message broker.
- **Dynamic Context Routing:** The frontend includes specialized features like Security Scanning and Architecture flowcharts, which dynamically modify the prompt context before routing to the LLM.
- **Interactive Architecture Diagrams:** Diagram requests generate Mermaid.js syntax that is automatically intercepted and rendered as interactive SVG flowcharts in the UI.
- **Expertise Toggling:** Users can adjust the technical depth of the response context from Beginner (analogies) to Senior (technical trade-offs).

## Tech Stack

- **Backend:** Java 21, Spring Boot (3.2), Spring AI, REST APIs
- **Message Broker:** RabbitMQ
- **Machine Learning Worker:** Python 3, HuggingFace (ll-MiniLM-L6-v2), 	ree-sitter
- **Database:** PostgreSQL with pgvector extension
- **Frontend:** HTML/CSS/JS, highlight.js, mermaid.js
- **LLM:** Google Gemini 2.5 Flash

## Architecture Flow

1. A GitHub URL is submitted via the client interface.
2. The Spring Boot application publishes a repository-processing job to a RabbitMQ queue.
3. A dedicated Python ML worker consumes the job, clones the repository to a temporary directory, and generates the AST.
4. The worker creates vector embeddings locally using a HuggingFace transformer model and stores the chunks in a pgvector enabled PostgreSQL database.
5. Client queries perform a cosine similarity search against the vector database, pulling the most relevant code chunks to augment the LLM prompt.

## Running Locally

### 1. Prerequisites
- Java 21+ and Maven
- Python 3.10+
- Docker
- Gemini API Key

### 2. Infrastructure Setup
Start the PostgreSQL vector database and RabbitMQ broker:
`ash
docker run -d --name enterprise-rag-db -e POSTGRES_USER=raguser -e POSTGRES_PASSWORD=ragpassword -e POSTGRES_DB=ragdb -p 5432:5432 pgvector/pgvector:pg16
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
`

### 3. Spring Boot Backend
Configure your API key in your environment variables or application properties, then run the main application class RagApplication.java. The API will start on port 8080.

### 4. Python ML Worker
Set up a virtual environment and start the worker to listen for RabbitMQ jobs:
`ash
cd worker
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
`

### 5. Frontend Client
Serve rontend/index.html using a local web server (e.g., Live Server) and open it in your browser.

## License
MIT License
