/**
 * AI Firewall Demo - Frontend JavaScript
 */

// DOM Elements
const messageInput = document.getElementById('message-input');
const chatMessages = document.getElementById('chat-messages');
const firewallToggle = document.getElementById('firewall-toggle');
const firewallStatus = document.getElementById('firewall-status');
const firewallDescription = document.getElementById('firewall-description');
const sendButton = document.getElementById('send-button');
const charCounter = document.getElementById('char-counter');
const totalMessagesEl = document.getElementById('total-messages');
const blockedAttemptsEl = document.getElementById('blocked-attempts');
const responseTimeEl = document.getElementById('response-time');
const threatLevelEl = document.getElementById('threat-level');
const connectionStatus = document.getElementById('connection-status');

// Session State
let sessionStats = {
    totalMessages: 1,
    blockedAttempts: 0,
    totalResponseTime: 0,
    avgResponseTime: 0,
    threatLevel: 'low'
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateCharCounter();
    loadSessionStats();
    
    // Check server health
    checkHealth();
    
    // Set up event listeners
    messageInput.addEventListener('input', updateCharCounter);
    firewallToggle.addEventListener('change', updateFirewallStatus);
    
    // Focus on input
    messageInput.focus();
});

// Update character counter
function updateCharCounter() {
    const length = messageInput.value.length;
    charCounter.textContent = `${length}/1000`;
    
    if (length > 1000) {
        charCounter.classList.add('text-danger');
        charCounter.classList.remove('text-muted');
    } else {
        charCounter.classList.remove('text-danger');
        charCounter.classList.add('text-muted');
    }
}

// Update firewall status display
function updateFirewallStatus() {
    const isActive = firewallToggle.checked;
    
    if (isActive) {
        firewallStatus.textContent = 'ACTIVE';
        firewallStatus.className = 'text-success';
        firewallDescription.innerHTML = `
            <div class="alert alert-success mb-0 py-2">
                <i class="fas fa-check-circle me-2"></i>
                <small>Firewall is actively monitoring for prompt injection attacks</small>
            </div>
        `;
    } else {
        firewallStatus.textContent = 'INACTIVE';
        firewallStatus.className = 'text-danger';
        firewallDescription.innerHTML = `
            <div class="alert alert-danger mb-0 py-2">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <small>Firewall is disabled - prompt injection attacks will not be blocked</small>
            </div>
        `;
    }
}

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Send message to server
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) {
        showAlert('Please enter a message', 'warning');
        return;
    }
    
    if (message.length > 1000) {
        showAlert('Message too long (max 1000 characters)', 'warning');
        return;
    }
    
    // Disable send button and show loading
    const originalButtonText = sendButton.innerHTML;
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
    
    // Add user message to chat
    addMessage(message, 'user');
    messageInput.value = '';
    updateCharCounter();
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        const startTime = Date.now();
        const firewallEnabled = firewallToggle.checked;
        
        // Send request to server
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                firewall: firewallEnabled
            })
        });
        
        const data = await response.json();
        const responseTime = Date.now() - startTime;
        
        // Remove typing indicator
        removeTypingIndicator();
        
        if (data.status === 'success') {
            // Update statistics
            updateStatistics(data, responseTime);
            
            // Add AI response
            addMessage(data.reply, 'assistant', data.blocked);
            
            // Update threat level
            if (data.blocked) {
                const threatLevel = data.threat_details?.severity || 'medium';
                updateThreatLevel(threatLevel);
                
                // Show threat alert
                showThreatAlert(data.threat_details);
            }
            
        } else {
            // Error handling
            addMessage(`Error: ${data.reply || 'Unknown error'}`, 'assistant', false);
            showAlert('Failed to send message', 'danger');
        }
        
    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessage('Network error. Please check your connection.', 'assistant', false);
        showAlert('Connection error', 'danger');
        
        // Update connection status
        connectionStatus.className = 'badge bg-danger';
        connectionStatus.innerHTML = '<i class="fas fa-circle me-1"></i>Disconnected';
    } finally {
        // Re-enable send button
        sendButton.disabled = false;
        sendButton.innerHTML = originalButtonText;
    }
}

// Update addMessage function
function addMessage(content, sender, isBlocked = false) {
    const messageDiv = document.createElement('div');
    const time = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const avatarIcon = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
    const senderName = sender === 'user' ? 'You' : 'AI Assistant';
    
    messageDiv.className = `message ${sender} ${isBlocked ? 'blocked' : ''}`;
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="${avatarIcon}"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <strong>${senderName}</strong>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-body">${formatMessage(content)}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    
    // Always scroll to bottom for new messages
    scrollToBottom();
    
    // Add animation delay
    const messages = document.querySelectorAll('.message');
    messages.forEach((msg, index) => {
        msg.style.animationDelay = `${index * 0.1}s`;
    });
}

// Format message with markdown-like styling
function formatMessage(text) {
    // Convert **bold** to <strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Convert bullet points
    formatted = formatted.replace(/^•\s+(.*?)$/gm, '<span class="text-muted">•</span> $1<br>');
    
    return formatted;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message assistant';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-header">
                <strong>AI Assistant</strong>
                <span class="message-time">Typing...</span>
            </div>
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Scroll to bottom of chat
function scrollToBottom() {
     const chatMessages = document.getElementById('chat-messages');
    
    // Small delay to ensure DOM is updated
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
}

// Clear chat
async function clearChat() {
    if (!confirm('Are you sure you want to clear the chat?')) {
        return;
    }
    
    try {
        const response = await fetch('/clear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Clear chat display
            chatMessages.innerHTML = `
                <div class="message assistant">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <strong>AI Assistant</strong>
                            <span class="message-time">Just now</span>
                        </div>
                        <div class="message-body">
                            Chat cleared! Firewall protection is 
                            <span class="${firewallToggle.checked ? 'text-success' : 'text-danger'}">
                                ${firewallToggle.checked ? 'ACTIVE' : 'INACTIVE'}
                            </span>.
                        </div>
                    </div>
                </div>
            `;
            
            // Reload statistics
            loadSessionStats();
            
            showAlert('Chat cleared successfully', 'success');
        }
    } catch (error) {
        console.error('Error clearing chat:', error);
        showAlert('Failed to clear chat', 'danger');
    }
}

// Update statistics
function updateStatistics(data, responseTime) {
    // Update local stats
    sessionStats.totalMessages = data.stats?.total_messages || sessionStats.totalMessages + 1;
    sessionStats.blockedAttempts = data.stats?.blocked_attempts || sessionStats.blockedAttempts;
    
    // Update response time
    if (data.response_time) {
        sessionStats.totalResponseTime += data.response_time;
        sessionStats.avgResponseTime = Math.round(
            sessionStats.totalResponseTime / (sessionStats.totalMessages - 1)
        );
    }
    
    // Update UI
    totalMessagesEl.textContent = sessionStats.totalMessages;
    blockedAttemptsEl.textContent = sessionStats.blockedAttempts;
    responseTimeEl.textContent = `${sessionStats.avgResponseTime}ms`;
    
    // Update threat level if blocked
    if (data.blocked) {
        const threatLevel = data.threat_details?.severity || 'medium';
        updateThreatLevel(threatLevel);
    }
}

// Update threat level display
function updateThreatLevel(level) {
    sessionStats.threatLevel = level;
    threatLevelEl.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    
    // Update color based on level
    threatLevelEl.className = 'stat-value';
    threatLevelEl.classList.add(`threat-${level}`);
}

// Load session statistics
async function loadSessionStats() {
    try {
        const response = await fetch('/stats');
        const data = await response.json();
        
        if (data.status === 'success' && data.stats) {
            sessionStats.totalMessages = data.stats.total_messages || 1;
            sessionStats.blockedAttempts = data.stats.blocked_attempts || 0;
            sessionStats.avgResponseTime = data.stats.avg_response_time || 0;
            
            totalMessagesEl.textContent = sessionStats.totalMessages;
            blockedAttemptsEl.textContent = sessionStats.blockedAttempts;
            responseTimeEl.textContent = `${sessionStats.avgResponseTime}ms`;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Check server health
async function checkHealth() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        if (data.status === 'healthy') {
            connectionStatus.className = 'badge bg-success';
            connectionStatus.innerHTML = '<i class="fas fa-circle me-1"></i>Connected';
        }
    } catch (error) {
        connectionStatus.className = 'badge bg-danger';
        connectionStatus.innerHTML = '<i class="fas fa-circle me-1"></i>Disconnected';
    }
}

// Show threat alert
function showThreatAlert(threatDetails) {
    if (!threatDetails || !threatDetails.threats) return;
    
    const threatCount = threatDetails.threat_count || 0;
    const severity = threatDetails.severity || 'medium';
    
    let alertClass = 'alert-warning';
    let icon = 'fa-exclamation-triangle';
    
    if (severity === 'high') {
        alertClass = 'alert-danger';
        icon = 'fa-skull-crossbones';
    } else if (severity === 'low') {
        alertClass = 'alert-info';
        icon = 'fa-info-circle';
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass} alert-dismissible fade show mt-3`;
    alertDiv.innerHTML = `
        <i class="fas ${icon} me-2"></i>
        <strong>Firewall Alert!</strong> Blocked ${threatCount} threat(s) - ${severity.toUpperCase()} severity
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert after chat window
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.parentNode.insertBefore(alertDiv, chatContainer.nextSibling);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 1050;
        min-width: 300px;
    `;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 3000);
}

// Set example prompt
function setExample(element) {
    const text = element.textContent.trim();
    messageInput.value = text;
    updateCharCounter();
    messageInput.focus();
    
    // Highlight the example briefly
    element.classList.add('bg-primary', 'text-white');
    setTimeout(() => {
        element.classList.remove('bg-primary', 'text-white');
    }, 500);
}