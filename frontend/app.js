document.addEventListener('DOMContentLoaded', () => {
    const ingestForm = document.getElementById('ingest-form');
    const repoInput = document.getElementById('repo-url');
    const ingestBtn = document.getElementById('ingest-btn');
    const ingestSpinner = document.getElementById('ingest-spinner');
    const ingestStatus = document.getElementById('ingest-status');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');

    const API_BASE = 'http://localhost:8080/api'; // Spring Boot backend
    const conversationId = 'conv-' + Math.random().toString(36).substring(2, 9); // Generate random session ID

    // Format text to handle basic markdown-like code blocks
    function formatMessageText(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        }
        return text.replace(/\n/g, '<br>');
    }

    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    }

    function addMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerText = sender === 'user' ? 'YOU' : 'AI';
        
        const content = document.createElement('div');
        content.className = 'content';
        content.innerHTML = sender === 'user' ? text : formatMessageText(text);
        
        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);
        
        messagesContainer.appendChild(msgDiv);
        
        // Apply syntax highlighting and Mermaid
        if (sender === 'system') {
            if (typeof hljs !== 'undefined') {
                msgDiv.querySelectorAll('pre code').forEach((block) => {
                    if (!block.classList.contains('language-mermaid')) {
                        hljs.highlightElement(block);
                    }
                });
            }
            if (typeof mermaid !== 'undefined') {
                msgDiv.querySelectorAll('code.language-mermaid').forEach(async (block, index) => {
                    const id = 'mermaid-' + Date.now() + '-' + index;
                    try {
                        const { svg } = await mermaid.render(id, block.textContent);
                        const container = document.createElement('div');
                        container.className = 'mermaid-diagram';
                        container.style.backgroundColor = 'white';
                        container.style.padding = '10px';
                        container.style.borderRadius = '8px';
                        container.innerHTML = svg;
                        block.parentElement.replaceWith(container);
                    } catch (e) {
                        console.error("Mermaid error", e);
                    }
                });
            }
        }
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Ingestion Logic
    ingestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = repoInput.value.trim();
        if (!url) return;

        // UI State
        ingestBtn.querySelector('span').classList.add('hidden');
        ingestSpinner.classList.remove('hidden');
        ingestBtn.disabled = true;
        ingestStatus.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE}/ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                ingestStatus.textContent = `Queued: Job ID ${data.jobId.substring(0,8)}...`;
                ingestStatus.className = 'status-msg success';
            } else {
                try {
                    const errData = await response.json();
                    ingestStatus.textContent = errData.error || 'Failed to submit repository';
                } catch {
                    ingestStatus.textContent = 'Failed to submit repository';
                }
                ingestStatus.className = 'status-msg error';
            }
        } catch (error) {
            console.error('Ingestion error:', error);
            ingestStatus.textContent = 'Network error - API unreachable';
            ingestStatus.className = 'status-msg error';
        } finally {
            ingestStatus.classList.remove('hidden');
            ingestBtn.querySelector('span').classList.remove('hidden');
            ingestSpinner.classList.add('hidden');
            ingestBtn.disabled = false;
            repoInput.value = '';
        }
    });

    async function sendChatRequest(query, actionType = 'CHAT') {
        if (!query) return;

        addMessage('user', query);
        chatInput.value = '';
        
        // Get expertise level from toggle
        const isSenior = document.getElementById('expertise-checkbox').checked;
        const expertiseLevel = isSenior ? 'SENIOR' : 'BEGINNER';

        const loadingId = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = `message system`;
        msgDiv.id = loadingId;
        msgDiv.innerHTML = `
            <div class="avatar">AI</div>
            <div class="content"><div class="spinner" style="border-top-color: var(--accent);"></div></div>
        `;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, conversationId, expertiseLevel, actionType })
            });

            const loadingNode = document.getElementById(loadingId);
            if (loadingNode) loadingNode.remove();

            if (response.ok) {
                const text = await response.text();
                addMessage('system', text);
            } else {
                try {
                    const errData = await response.json();
                    addMessage('system', `Error: ${errData.error || 'Server returned an error'}`);
                } catch {
                    addMessage('system', 'Sorry, I encountered an error communicating with the backend API.');
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            const loadingNode = document.getElementById(loadingId);
            if (loadingNode) loadingNode.remove();
            addMessage('system', 'Network error - API unreachable. Are you sure the Spring Boot server is running on port 8080?');
        }
    }

    // Chat Logic
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendChatRequest(chatInput.value.trim(), 'CHAT');
    });

    // Action Buttons
    document.getElementById('btn-security').addEventListener('click', () => {
        sendChatRequest('Run a security scan on the codebase.', 'SECURITY');
    });
    document.getElementById('btn-diagram').addEventListener('click', () => {
        sendChatRequest('Generate an architecture diagram of the core system.', 'DIAGRAM');
    });
    document.getElementById('btn-autocode').addEventListener('click', () => {
        const feature = prompt('What feature do you want to auto-code?');
        if (feature) {
            sendChatRequest(`Auto-code the following feature: ${feature}`, 'AUTOCODE');
        }
    });
});
