import pika
import json
import os
import tempfile
import psycopg2
from sentence_transformers import SentenceTransformer
from git import Repo
import tree_sitter_java as tsjava
from tree_sitter import Language, Parser, Query

# Initialize Sentence Transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Setup Tree-sitter for Java
JAVA_LANGUAGE = Language(tsjava.language())
parser = Parser()
parser.language = JAVA_LANGUAGE

# Connect to PostgreSQL
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "raguser")
DB_PASS = os.getenv("DB_PASS", "ragpassword")
DB_NAME = os.getenv("DB_NAME", "ragdb")

def get_db_connection():
    return psycopg2.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, dbname=DB_NAME)

def process_repository(repo_url, job_id):
    print(f"Processing job {job_id} for repo {repo_url}")
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Cloning {repo_url} into {temp_dir}")
        try:
            Repo.clone_from(repo_url, temp_dir)
            
            chunks = []
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    if file.endswith(".java"):
                        file_path = os.path.join(root, file)
                        process_java_file(file_path, repo_url, chunks)
            
            if chunks:
                insert_into_db(chunks, job_id)
            print(f"Finished processing job {job_id}. Inserted {len(chunks)} chunks.")
            
        except Exception as e:
            print(f"Error processing repository: {e}")

def process_java_file(file_path, repo_url, chunks_list):
    with open(file_path, 'r', encoding='utf-8') as f:
        source_code = f.read()
    
    tree = parser.parse(bytes(source_code, "utf8"))
    
    # Very basic AST chunking: extracting methods
    # A robust implementation would walk the tree and capture classes/methods with docstrings.
    # We will use a simple query for methods.
    query = Query(JAVA_LANGUAGE, """
    (method_declaration) @method
    """)
    from tree_sitter import QueryCursor
    cursor = QueryCursor(query)
    captures = cursor.captures(tree.root_node)
    
    for nodes in captures.values():
        for node in nodes:
            method_text = source_code[node.start_byte:node.end_byte]
        
        # Create embedding
        embedding = model.encode(method_text).tolist()
        
        chunks_list.append({
            "content": method_text,
            "metadata": {
                "file_path": file_path,
                "type": "method",
                "repo_url": repo_url
            },
            "embedding": embedding
        })

def insert_into_db(chunks, job_id):
    # Ensure pgvector extension and table exist
    # Spring AI's vector_store table is typically created automatically by the backend if configured, 
    # but we will insert raw into it or a custom table.
    # Assuming standard Spring AI pgvector table: vector_store
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create table if not exists (in case worker runs before spring boot)
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS vector_store (
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                content text,
                metadata jsonb,
                embedding vector(384) 
            );
        """)
        
        for chunk in chunks:
            cursor.execute("""
                INSERT INTO vector_store (content, metadata, embedding)
                VALUES (%s, %s, %s)
            """, (chunk['content'], json.dumps(chunk['metadata']), chunk['embedding']))
            
        conn.commit()
    except Exception as e:
        print(f"Database error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

def callback(ch, method, properties, body):
    try:
        message = json.loads(body)
        repo_url = message.get("repo_url")
        job_id = message.get("job_id")
        
        if repo_url and job_id:
            process_repository(repo_url, job_id)
            
    except Exception as e:
        print(f"Error processing message: {e}")
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)

def main():
    credentials = pika.PlainCredentials('raguser', 'ragpassword')
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost', credentials=credentials))
    channel = connection.channel()
    
    queue_name = 'repo.ingestion.queue'
    channel.queue_declare(queue_name, durable=True)
    
    print(' [*] Waiting for messages. To exit press CTRL+C')
    channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=False)
    
    channel.start_consuming()

if __name__ == '__main__':
    main()
