// Main application that control the flow of the interaction// Main application controller
// Orchestrates StageManager, UserProfile, and ChatInterface

import config from '../config.js';
import StageManager from './stageManager.js';
import UserProfile from './userProfile.js';
import ChatInterface from './chat.js';
import OpenAIService from './openai.js';

/**
 * Main Application Class
 * Controls the entire AI Gym Buddy experience
 */
class AiGymBuddy {
    constructor() {
        // Initialize core services
        this.stageManager = new StageManager();
        this.userProfile = new UserProfile();
        this.chatInterface = null;
        this.openaiService = new OpenAIService();
        
        // UI References
        this.appContainer = null;
        this.currentStageElement = null;
        
        // State
        this.isInitialized = false;
        
        if (config.app.debug) {
            console.log('🚀 AI Gym Buddy initializing...');
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Get app container
            this.appContainer = document.getElementById('app');
            if (!this.appContainer) {
                throw new Error('App container not found');
            }

            // Check backend health
            const isHealthy = await this.openaiService.checkHealth();
            if (!isHealthy) {
                this.showError('Backend server is not available. Please try again later.');
                return;
            }

            // Listen for stage changes
            this.stageManager.addListener((newStage, previousStage) => {
                this.handleStageChange(newStage, previousStage);
            });

            // Render initial stage
            this.renderCurrentStage();
            
            this.isInitialized = true;
            
            if (config.app.debug) {
                console.log('✅ AI Gym Buddy initialized successfully');
            }

        } catch (error) {
            console.error('❌ Failed to initialize AI Gym Buddy:', error);
            this.showError('Failed to initialize the application. Please refresh the page.');
        }
    }

    /**
     * Handle stage changes and render appropriate UI
     * @param {string} newStage - New stage name
     * @param {string} previousStage - Previous stage name
     */
    handleStageChange(newStage, previousStage) {
        if (config.app.debug) {
            console.log(`🔄 Stage changed: ${previousStage} → ${newStage}`);
        }
        
        // Clean up previous stage
        this.cleanupCurrentStage();
        
        // Render new stage
        this.renderCurrentStage();
    }

    /**
     * Render the current stage UI
     */
    renderCurrentStage() {
        const stage = this.stageManager.getCurrentStage();
        
        switch (stage) {
            case config.stages.WELCOME:
                this.renderWelcomeStage();
                break;
            case config.stages.ONBOARDING:
                this.renderOnboardingStage();
                break;
            case config.stages.SUMMARY:
                this.renderSummaryStage();
                break;
            case config.stages.CHATTING:
                this.renderChattingStage();
                break;
            default:
                this.showError(`Unknown stage: ${stage}`);
        }
    }

    /**
     * Render Welcome Stage
     */
    renderWelcomeStage() {
        const html = `
            <div class="stage welcome-stage">
                <h1>🏋️ Welcome to AI Gym Buddy!</h1>
                <p>Your personal AI fitness coach is here to help you achieve your fitness goals.</p>
                <p>Get personalized workout plans, exercise advice, and motivation tailored just for you.</p>
                <p>Let's start by learning about your fitness goals and preferences.</p>
                <button class="btn" id="start-onboarding">Get Started</button>
            </div>
        `;
        
        this.appContainer.innerHTML = html;
        
        // Add event listener
        document.getElementById('start-onboarding').addEventListener('click', () => {
            this.stageManager.nextStage();
        });
    }

    /**
     * Render Onboarding Stage
     */
    renderOnboardingStage() {
        const question = this.userProfile.getCurrentQuestion();
        const progress = this.userProfile.getProgress();
        
        if (!question) {
            // No more questions, move to summary
            this.stageManager.nextStage();
            return;
        }

        const html = `
            <div class="stage onboarding-stage">
                <h2>Let's Get to Know You</h2>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progress.progressPercent}%"></div>
                </div>
                <p>Question ${progress.currentQuestion} of ${progress.totalQuestions}</p>
                
                <h3>${question.question}</h3>
                <div class="options" id="question-options">
                    ${this.renderQuestionOptions(question)}
                </div>
                
                <div class="navigation">
                    ${progress.canGoBack ? '<button class="btn" id="prev-question">← Previous</button>' : ''}
                    <button class="btn" id="next-question" disabled>Next →</button>
                </div>
            </div>
        `;
        
        this.appContainer.innerHTML = html;
        this.setupOnboardingListeners(question);
    }

    /**
     * Render question options based on question type
     * @param {Object} question - Question object
     * @returns {string} HTML for question options
     */
    renderQuestionOptions(question) {
        let html = '';
        
        question.options.forEach((option, index) => {
            const inputType = question.type === 'checkbox' ? 'checkbox' : 'radio';
            const name = question.type === 'checkbox' ? `${question.id}[]` : question.id;
            
            html += `
                <label>
                    <input type="${inputType}" name="${name}" value="${option}" data-question="${question.id}">
                    ${option}
                </label>
            `;
        });
        
        return html;
    }

    /**
     * Setup event listeners for onboarding stage
     * @param {Object} question - Current question object
     */
    setupOnboardingListeners(question) {
        const nextBtn = document.getElementById('next-question');
        const prevBtn = document.getElementById('prev-question');
        const inputs = document.querySelectorAll(`input[data-question="${question.id}"]`);
        
        // Handle input changes
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.handleAnswerChange(question);
            });
        });
        
        // Next button
        nextBtn?.addEventListener('click', () => {
            this.handleNextQuestion(question);
        });
        
        // Previous button
        prevBtn?.addEventListener('click', () => {
            this.userProfile.previousQuestion();
            this.renderOnboardingStage();
        });
    }

    /**
     * Handle answer selection changes
     * @param {Object} question - Current question object
     */
    handleAnswerChange(question) {
        const nextBtn = document.getElementById('next-question');
        const inputs = document.querySelectorAll(`input[data-question="${question.id}"]:checked`);
        
        // Enable next button if answer selected
        nextBtn.disabled = inputs.length === 0;
    }

    /**
     * Handle next question navigation
     * @param {Object} question - Current question object
     */
    handleNextQuestion(question) {
        const inputs = document.querySelectorAll(`input[data-question="${question.id}"]:checked`);
        
        if (inputs.length === 0) {
            alert('Please select an answer before continuing.');
            return;
        }
        
        // Get selected values
        let answer;
        if (question.type === 'checkbox') {
            answer = Array.from(inputs).map(input => input.value);
        } else {
            answer = inputs[0].value;
        }
        
        // Save answer
        this.userProfile.setAnswer(question.id, answer);
        
        // Move to next question or complete onboarding
        const nextQuestion = this.userProfile.nextQuestion();
        if (nextQuestion) {
            this.renderOnboardingStage();
        } else {
            this.stageManager.nextStage();
        }
    }

    /**
     * Render Summary Stage
     */
    renderSummaryStage() {
        const profile = this.userProfile.getProfile();
        const summary = this.userProfile.getSummary();
        
        const html = `
            <div class="stage summary-stage">
                <h2>🎯 Your Fitness Profile</h2>
                <p>Great! Here's what I learned about you:</p>
                
                <div class="profile-summary">
                    ${summary.split('\n').map(line => `<p><strong>${line}</strong></p>`).join('')}
                </div>
                
                <p>I'm ready to help you achieve your fitness goals! Let's start chatting.</p>
                
                <div class="navigation">
                    <button class="btn" id="edit-profile">← Edit Profile</button>
                    <button class="btn" id="start-chat">Start Chatting →</button>
                </div>
            </div>
        `;
        
        this.appContainer.innerHTML = html;
        
        // Add event listeners
        document.getElementById('edit-profile').addEventListener('click', () => {
            this.stageManager.goBack();
        });
        
        document.getElementById('start-chat').addEventListener('click', () => {
            this.stageManager.nextStage();
        });
    }

    /**
     * Render Chatting Stage
     */
    renderChattingStage() {
        const profile = this.userProfile.getProfile();
        const name = profile.name || 'there';
        
        const html = `
            <div class="stage chatting-stage">
                <div class="chat-header">
                    <h2>💬 Chat with Your AI Gym Buddy</h2>
                    <p>Ask me anything about fitness, workouts, or nutrition!</p>
                </div>
                
                <div class="chat-messages" id="chat-messages"></div>
                
                <div class="chat-input">
                    <input type="text" id="message-input" placeholder="Type your fitness question here..." maxlength="500">
                    <button class="btn" id="send-message">Send</button>
                </div>
                
                <div class="chat-actions">
                    <button class="btn" id="new-conversation">New Conversation</button>
                    <button class="btn" id="edit-profile-chat">Edit Profile</button>
                </div>
            </div>
        `;
        
        this.appContainer.innerHTML = html;
        
        // Initialize chat interface
        this.chatInterface = new ChatInterface(this.userProfile);
        this.chatInterface.initialize('chat-messages');
        
        this.setupChatListeners();
    }

    /**
     * Setup event listeners for chat stage
     */
    setupChatListeners() {
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-message');
        const newConversationBtn = document.getElementById('new-conversation');
        const editProfileBtn = document.getElementById('edit-profile-chat');
        
        // Send message on button click
        sendButton.addEventListener('click', () => {
            this.sendChatMessage();
        });
        
        // Send message on Enter key
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });
        
        // New conversation
        newConversationBtn.addEventListener('click', () => {
            this.chatInterface.clearMessages();
            this.chatInterface.addWelcomeMessage();
        });
        
        // Edit profile
        editProfileBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to edit your profile? This will start a new conversation.')) {
                this.userProfile.reset();
                this.stageManager.setStage(config.stages.ONBOARDING);
            }
        });
    }

    /**
     * Send chat message
     */
    async sendChatMessage() {
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-message');
        const message = messageInput.value.trim();
        
        if (!message || this.chatInterface.getIsLoading()) {
            return;
        }
        
        // Disable input during processing
        messageInput.disabled = true;
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';
        
        try {
            await this.chatInterface.sendMessage(message);
            messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            // Re-enable input
            messageInput.disabled = false;
            sendButton.disabled = false;
            sendButton.textContent = 'Send';
            messageInput.focus();
        }
    }

    /**
     * Clean up current stage resources
     */
    cleanupCurrentStage() {
        // Remove event listeners, clear intervals, etc.
        if (this.chatInterface) {
            // Chat cleanup if needed
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError(message) {
        const html = `
            <div class="stage error-stage">
                <h2>⚠️ Oops!</h2>
                <p>${message}</p>
                <button class="btn" onclick="location.reload()">Refresh Page</button>
            </div>
        `;
        
        this.appContainer.innerHTML = html;
    }

    /**
     * Get debug information for all components
     * @returns {Object} Complete debug info
     */
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            stageManager: this.stageManager.getDebugInfo(),
            userProfile: this.userProfile.getDebugInfo(),
            chatInterface: this.chatInterface?.getDebugInfo(),
            openaiService: this.openaiService.getDebugInfo()
        };
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new AiGymBuddy();
    app.init();
    
    // Make app available globally for debugging
    if (config.app.debug) {
        window.gymBuddy = app;
        console.log('🔧 Debug: App instance available as window.gymBuddy');
    }
});