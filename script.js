// Send message function
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    messageInput.value = '';
    charCount.textContent = '0/1000';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Disable send button during processing
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    
    // Make API call
    const startTime = Date.now();
    const firewallEnabled = firewallToggle.checked;
    
    fetch("/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message: message, firewall: firewallEnabled})
    })
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        const responseTime = Date.now() - startTime;
        
        // Update statistics
        if (data.stats) {
            blockedCountEl.textContent = data.stats.blocked_attempts || stats.blockedCount;
            messageCountEl.textContent = data.stats.total_messages || stats.messageCount;
            responseTimeEl.textContent = `${data.stats.avg_response_time || stats.avgResponseTime}ms`;
            
            // Update local stats
            stats.blockedCount = data.stats.blocked_attempts || stats.blockedCount;
            stats.messageCount = data.stats.total_messages || stats.messageCount;
            stats.avgResponseTime = data.stats.avg_response_time || stats.avgResponseTime;
        }
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add response message
        if (data.blocked) {
            addMessage(data.reply, 'assistant', true);
            
            // Update blocked count
            stats.blockedCount = data.stats?.blocked_attempts || stats.blockedCount + 1;
            blockedCountEl.textContent = stats.blockedCount;
        } else {
            addMessage(data.reply, 'assistant', false);
        }
        
        // Update message count
        stats.messageCount = data.stats?.total_messages || stats.messageCount + 1;
        messageCountEl.textContent = stats.messageCount;
        
        // Update response time
        if (data.response_time) {
            stats.totalResponseTime += data.response_time;
            stats.avgResponseTime = Math.round(stats.totalResponseTime / (stats.messageCount - 1));
            responseTimeEl.textContent = `${stats.avgResponseTime}ms`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessage(`Error: ${error.message}. Please try again.`, 'assistant', false);
    })
    .finally(() => {
        // Re-enable send button
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send';
    });
}

// Add clear chat functionality
function clearChat() {
    if (confirm('Are you sure you want to clear the chat?')) {
        fetch("/clear", {
            method: "POST",
            headers: {"Content-Type": "application/json"}
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                chatMessages.innerHTML = `
                    <div class="message assistant welcome-msg">
                        <div class="message-header">
                            <i class="fas fa-robot text-primary me-2"></i>
                            <strong>AI Assistant</strong>
                            <span class="message-time ms-2">Just now</span>
                        </div>
                        <div class="message-content">
                            Chat cleared! The firewall protection is currently <span class="${firewallToggle.checked ? 'text-success' : 'text-danger'}">${firewallToggle.checked ? 'ACTIVE' : 'INACTIVE'}</span>. 
                            Try to bypass my instructions with prompt injection to see how the firewall responds.
                        </div>
                    </div>
                `;
                
                // Reset stats
                stats.messageCount = 1;
                messageCountEl.textContent = stats.messageCount;
                
                // Refresh stats from server
                fetch("/stats")
                    .then(res => res.json())
                    .then(data => {
                        if (data.stats) {
                            blockedCountEl.textContent = data.stats.blocked_attempts || 0;
                            messageCountEl.textContent = data.stats.total_messages || 1;
                            responseTimeEl.textContent = `${data.stats.avg_response_time || 0}ms`;
                        }
                    });
            }
        });
    }
}