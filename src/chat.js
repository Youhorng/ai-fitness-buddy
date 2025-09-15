// Manage chatbot functionalities
// Allow users to ask questions and get responses back from the chat history

import OpenAIService from './openai.js';
import config from '../config.js';

/**
 * ChatInterface manages the conversation between user and AI
 * Handles message history, UI updates, and API communication
 */
class ChatInterface {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.openaiService = new OpenAIService();
        this.conversationHistory = [];
        this.isLoading = false;
        this.messageContainer = null;
        this.messageIdCounter = 0;
        
        if (config.app.debug) {
            console.log('💬 Chat Interface initialized');
        }
    }

    /**
     * Initialize chat interface and setup UI references
     * @param {string} containerId - ID of the chat messages container
     */
    initialize(containerId = 'chat-messages') {
        this.messageContainer = document.getElementById(containerId);
        
        if (!this.messageContainer) {
            console.error(`❌ Chat container '${containerId}' not found`);
            return false;
        }
        
        // Send welcome message
        this.addWelcomeMessage();
        return true;
    }

    /**
     * Send welcome message based on user profile
     */
    addWelcomeMessage() {
        const profile = this.userProfile.getProfile();
        let welcomeMessage = "Hi there! I'm your AI Gym Buddy! 💪";
        
        if (this.userProfile.checkIfComplete()) {
            const name = profile.name || 'there';
            const goals = Array.isArray(profile.goals) ? profile.goals.join(' and ') : profile.goals;
            welcomeMessage = `Hi ${name}! I'm excited to help you with your ${goals} goals. What would you like to work on today?`;
        } else {
            welcomeMessage += "\n\nI see you haven't completed your profile yet, but I can still help you with general fitness advice! What questions do you have?";
        }
        
        this.addMessage('assistant', welcomeMessage);
    }

    /**
     * Send a message and get AI response
     * @param {string} message - User's message
     * @returns {Promise<string|null>} AI response or null if failed
     */
    async sendMessage(message) {
        if (this.isLoading) {
            console.warn('⚠️ Already processing a message');
            return null;
        }

        if (!message || message.trim().length === 0) {
            console.warn('⚠️ Empty message not sent');
            return null;
        }

        this.isLoading = true;
        
        try {
            // Add user message to chat
            this.addMessage('user', message.trim());
            
            // Show typing indicator
            this.showTypingIndicator();
            
            if (config.app.debug) {
                console.log('📤 Sending message:', message.trim());
            }
            
            // Send to AI service
            const response = await this.openaiService.sendMessage(
                message.trim(),
                this.userProfile.getProfile(),
                this.conversationHistory
            );
            
            // Remove typing indicator
            this.hideTypingIndicator();
            
            if (config.app.debug) {
                console.log('📥 Received response:', response);
            }
            
            if (response.success && response.message) {
                // Add AI response to chat
                this.addMessage('assistant', response.message);
                return response.message;
            } else {
                // Handle error
                const errorMsg = response.error || 'Unknown error occurred';
                this.addMessage('system', `Sorry, I encountered an error: ${errorMsg}`);
                return null;
            }
            
        } catch (error) {
            this.hideTypingIndicator();
            console.error('❌ Chat error:', error);
            this.addMessage('system', 'Sorry, something went wrong. Please try again.');
            return null;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Add a message to the conversation history and UI
     * @param {string} role - 'user', 'assistant', or 'system'
     * @param {string} content - Message content
     */
    addMessage(role, content) {
        const message = {
            role,
            content: String(content), // Ensure content is always a string
            timestamp: new Date().toISOString(),
            id: `msg_${++this.messageIdCounter}`
        };
        
        // Add to history (exclude system messages from AI context)
        if (role !== 'system') {
            this.conversationHistory.push({
                role: message.role,
                content: message.content
            });
        }
        
        // Render message in UI
        this.renderMessage(message);
        
        if (config.app.debug) {
            console.log(`💬 Added ${role} message:`, content.substring(0, 50) + '...');
        }
    }

    /**
     * Render a message in the UI with proper formatting
     * @param {Object} message - Message object
     */
    renderMessage(message) {
        if (!this.messageContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        messageDiv.id = message.id;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Format the content for better display
        const formattedContent = this.formatMessageContent(message.content);
        contentDiv.innerHTML = formattedContent;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-timestamp';
        timeDiv.textContent = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        
        this.messageContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * Format message content for better display
     * @param {string} content - Raw message content
     * @returns {string} Formatted HTML content
     */
    formatMessageContent(content) {
        if (!content || typeof content !== 'string') {
            return 'Empty message';
        }
        
        return content
            // Convert line breaks to HTML breaks
            .replace(/\n/g, '<br>')
            // Bold text for **text**
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic text for *text*
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks for `code`
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Convert numbered lists (improve formatting)
            .replace(/^\d+\.\s(.+)$/gm, '<div class="list-item">$&</div>')
            // Convert bullet points
            .replace(/^[-•]\s(.+)$/gm, '<div class="list-item">• $1</div>')
            // Convert workout sections
            .replace(/^(Workout|Exercise|Day \d+):/gm, '<strong>$&</strong>')
            // Add some spacing around sections
            .replace(/<br><strong>/g, '<br><br><strong>');
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        if (!this.messageContainer) return;
        
        // Remove existing typing indicator
        this.hideTypingIndicator();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing';
        typingDiv.id = 'typing-indicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const dotsDiv = document.createElement('div');
        dotsDiv.className = 'typing-dots';
        dotsDiv.innerHTML = '<span></span><span></span><span></span>';
        
        contentDiv.appendChild(dotsDiv);
        typingDiv.appendChild(contentDiv);
        
        this.messageContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    /**
     * Scroll chat to bottom smoothly
     */
    scrollToBottom() {
        if (this.messageContainer) {
            setTimeout(() => {
                this.messageContainer.scrollTo({
                    top: this.messageContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }

    /**
     * Clear all messages and restart conversation
     */
    clearMessages() {
        this.conversationHistory = [];
        if (this.messageContainer) {
            this.messageContainer.innerHTML = '';
        }
        this.messageIdCounter = 0;
        
        // Add welcome message again
        this.addWelcomeMessage();
        
        if (config.app.debug) {
            console.log('🧹 Chat cleared and restarted');
        }
    }

    /**
     * Get loading status
     * @returns {boolean} Whether chat is currently processing
     */
    getIsLoading() {
        return this.isLoading;
    }

    /**
     * Get conversation history
     * @returns {Array} Copy of conversation history
     */
    getHistory() {
        return [...this.conversationHistory];
    }

    /**
     * Export chat history as formatted text
     * @returns {string} Chat history as formatted text
     */
    exportHistory() {
        if (this.conversationHistory.length === 0) {
            return 'No conversation history yet.';
        }
        
        return this.conversationHistory
            .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
            .join('\n\n');
    }

    /**
     * Get debug info
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            isLoading: this.isLoading,
            historyLength: this.conversationHistory.length,
            hasContainer: !!this.messageContainer,
            messageCount: this.messageIdCounter,
            openaiService: this.openaiService.getDebugInfo()
        };
    }
}

export default ChatInterface;