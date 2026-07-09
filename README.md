<div align="center">

# 🔦 Syntax Scout

**An interactive, AI-powered Codebase Assistant designed to help engineering teams instantly navigate, understand, and build upon complex GitHub repositories.**

[![Java](https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](#)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](#)
[![Python](https://img.shields.io/badge/Python_3-3776AB?style=for-the-badge&logo=python&logoColor=white)](#)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](#)

</div>

<br>

Syntax Scout makes it easy for developers to understand large, unfamiliar codebases. By simply pasting a GitHub URL, the tool scans and reads the code, allowing you to ask questions and get instant, accurate answers about how the project works.

### 🚀 Accelerating Developer Onboarding
Joining a new project and reading thousands of lines of code is a slow process. Syntax Scout speeds this up by acting as your personal AI pair programmer.

It adjusts to your experience level automatically. If you are a junior engineer, it explains complex logic using simple, easy-to-understand analogies. If you are a senior engineer, it skips the basics and focuses directly on advanced topics like system architecture, security vulnerabilities, and algorithmic efficiency.

Whether you need a visual flowchart of how the system connects or want the AI to write new code that matches the project's style, Syntax Scout gives you exactly the context you need to start coding faster.

---

## ✨ Core Features

- **AST Code Parsing:** Uses `tree-sitter` to break down repositories into semantically meaningful chunks (methods and classes).
- **Asynchronous Processing:** Heavy machine learning tasks (cloning, parsing, and embedding generation) are completely decoupled from the main API using a **RabbitMQ** message broker.
- **Dynamic Context Routing:** The frontend includes specialized features like Security Scanning and Architecture Flowcharts, which dynamically modify the prompt context before routing to the LLM.
- **Interactive Diagrams:** Diagram requests generate Mermaid.js syntax that is automatically intercepted and rendered as interactive SVG flowcharts directly in the UI.
- **Expertise Toggling:** Users can adjust the technical depth of the response context from Beginner (analogies) to Senior (technical trade-offs).

---

<details>
<summary><b>⚙️ View Architecture Flow (Click to Expand)</b></summary>
<br>

1. **Ingest:** A GitHub URL is submitted via the client interface.
2. **Queue:** The Spring Boot application publishes a repository-processing job to a RabbitMQ queue.
3. **Parse:** A dedicated Python ML worker consumes the job, clones the repository to a temporary directory, and generates the AST.
4. **Embed:** The worker creates vector embeddings locally using a HuggingFace transformer model and stores the chunks in a `pgvector` enabled PostgreSQL database.
5. **Retrieve:** Client queries perform a cosine similarity search against the vector database, pulling the most relevant code chunks to augment the LLM prompt.

</details>

<details>
<summary><b>💻 Running Locally (Click to Expand)</b></summary>
<br>

### 1. Prerequisites
- Java 21+ and Maven
- Python 3.10+
- Docker
- Gemini API Key

### 2. Infrastructure Setup
Start the PostgreSQL vector database and RabbitMQ broker:
```bash
docker run -d --name enterprise-rag-db -e POSTGRES_USER=raguser -e POSTGRES_PASSWORD=ragpassword -e POSTGRES_DB=ragdb -p 5432:5432 pgvector/pgvector:pg16

docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management


3. Spring Boot Backend
Configure your API key in your environment variables or application properties, then run the main application class RagApplication.java. The API will start on port 8080.

4. Python ML Worker
Set up a virtual environment and start the worker to listen for RabbitMQ jobs:

bash


cd worker
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
5. Frontend Client
Serve frontend/index.html using a local web server (e.g., Live Server) and open it in your browser.

📜 License
MIT License
