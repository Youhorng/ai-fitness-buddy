// OpenAI API for chatbot interaction with system prompt
// Inlcude the user profile and chat history in the prompt to provide context
// Frontend service to communicate with our backend API
// Handles HTTP requests to server/index.js which talks to OpenAI

import config from '../config.js';

/**
 * OpenAI Service - Frontend API client
 * Makes HTTP requests to our backend server
 */
class OpenAIService {
    constructor() {
        this.baseURL = config.api.baseURL;
        this.isHealthy = false;
        
        if (config.app.debug) {
            console.log('🤖 OpenAI Service initialized with URL:', this.baseURL);
        }
    }

    /**
     * Check if the backend server is healthy
     * @returns {Promise<boolean>} Server health status
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseURL}${config.api.endpoints.health}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.isHealthy = true;
                
                if (config.app.debug) {
                    console.log('✅ Backend health check passed:', data);
                }
                
                return true;
            } else {
                throw new Error(`Health check failed: ${response.status}`);
            }
            
        } catch (error) {
            this.isHealthy = false;
            console.error('❌ Backend health check failed:', error);
            return false;
        }
    }

    /**
     * Send a message to the AI and get response
     * @param {string} message - User's message
     * @param {Object} userProfile - User profile data
     * @param {Array} conversationHistory - Previous messages
     * @returns {Promise<Object>} API response
     */
    async sendMessage(message, userProfile, conversationHistory = []) {
        try {
            // Validate inputs
            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                throw new Error('Message is required');
            }
    
            // Prepare messages array for OpenAI format
            const messages = [
                ...conversationHistory,
                { role: 'user', content: message.trim() }
            ];
    
            if (config.app.debug) {
                console.log('📤 Sending message to backend:', { 
                    message: message.trim(), 
                    userProfile,
                    messagesCount: messages.length 
                });
            }
    
            const response = await fetch(`${this.baseURL}${config.api.endpoints.chat}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages,
                    userProfile: userProfile || {}
                })
            });
    
            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || `HTTP ${response.status}: ${response.statusText}`);
            }
    
            const data = await response.json();
    
            if (config.app.debug) {
                console.log('📥 Raw backend response:', data);
            }
    
            // Validate response format
            if (!data.success) {
                throw new Error(data.details || 'Backend returned unsuccessful response');
            }
    
            // Make sure we return the message as a string
            const aiMessage = typeof data.message === 'string' 
                ? data.message 
                : JSON.stringify(data.message);
    
            return {
                success: true,
                message: aiMessage,
                usage: data.usage || null
            };
    
        } catch (error) {
            console.error('❌ OpenAI Service Error:', error);
            
            return {
                success: false,
                error: error.message || 'Failed to get response from AI',
                details: error.stack || null
            };
        }
    }

    /**
     * Test the connection with a simple message
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        try {
            const testMessage = "Hi! Just testing the connection.";
            const result = await this.sendMessage(testMessage, {
                goals: ['General Fitness'],
                level: 'Beginner',
                equipment: ['No Equipment'],
                time: '15-30 minutes'
            });

            if (result.success) {
                console.log('✅ Connection test successful');
                return { success: true, message: 'Connection working!' };
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get the health status
     * @returns {boolean} Current health status
     */
    getHealthStatus() {
        return this.isHealthy;
    }

    /**
     * Handle network errors with user-friendly messages
     * @param {Error} error - The error object
     * @returns {string} User-friendly error message
     */
    getErrorMessage(error) {
        if (error.message.includes('Failed to fetch')) {
            return 'Unable to connect to server. Please check your internet connection.';
        }
        
        if (error.message.includes('429')) {
            return 'Too many requests. Please wait a moment and try again.';
        }
        
        if (error.message.includes('500')) {
            return 'Server error. Please try again later.';
        }
        
        if (error.message.includes('401') || error.message.includes('403')) {
            return 'Authentication error. Please contact support.';
        }
        
        return error.message || 'Something went wrong. Please try again.';
    }

    /**
     * Get debug information
     * @returns {Object} Debug info
     */
    getDebugInfo() {
        return {
            baseURL: this.baseURL,
            isHealthy: this.isHealthy,
            endpoints: config.api.endpoints
        };
    }
}

export default OpenAIService;