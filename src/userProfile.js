// Manage user profile during the onboarding process// Manage user profile data and onboarding questions
// Collects: goals, fitness level, equipment, workout time

import config from '../config.js';

/**
 * UserProfile manages user data collection during onboarding
 * and provides the collected data for personalized AI responses
 */
class UserProfile {
    constructor() {
        // Initialize empty profile
        this.profile = {
            name: '',
            goals: [],
            level: '',
            equipment: [],
            time: '',
            preferences: {},
            completedAt: null
        };
        
        // Track onboarding progress
        this.currentQuestionIndex = 0;
        this.isComplete = false;
        
        if (config.app.debug) {
            console.log('👤 UserProfile initialized');
        }
    }

    /**
     * Get the current onboarding question
     * @returns {Object|null} Current question object or null if completed
     */
    getCurrentQuestion() {
        const questions = config.onboarding.questions;
        
        if (this.currentQuestionIndex >= questions.length) {
            return null;
        }
        
        return questions[this.currentQuestionIndex];
    }

    /**
     * Check if there are more questions
     * @returns {boolean} True if more questions exist
     */
    hasNextQuestion() {
        return this.currentQuestionIndex < config.onboarding.questions.length - 1;
    }

    /**
     * Move to the next question
     * @returns {Object|null} Next question or null if no more questions
     */
    nextQuestion() {
        if (this.hasNextQuestion()) {
            this.currentQuestionIndex++;
            return this.getCurrentQuestion();
        }
        
        // Mark as complete when all questions are answered
        this.markComplete();
        return null;
    }

    /**
     * Go back to previous question
     * @returns {Object|null} Previous question or null if at first question
     */
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            return this.getCurrentQuestion();
        }
        return null;
    }

    /**
     * Set answer for a specific question
     * @param {string} questionId - The question ID (goals, level, equipment, time)
     * @param {string|Array} answer - The user's answer
     * @returns {boolean} Success status
     */
    setAnswer(questionId, answer) {
        try {
            // Validate question exists
            const validIds = config.onboarding.questions.map(q => q.id);
            if (!validIds.includes(questionId)) {
                console.error(`❌ Invalid question ID: ${questionId}`);
                return false;
            }

            // Validate answer is not empty
            if (!answer || (Array.isArray(answer) && answer.length === 0)) {
                console.warn(`⚠️ Empty answer for question: ${questionId}`);
                return false;
            }

            // Set the answer
            this.profile[questionId] = answer;
            
            if (config.app.debug) {
                console.log(`✅ Set ${questionId}:`, answer);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error setting answer:', error);
            return false;
        }
    }

    /**
     * Set user's name
     * @param {string} name - User's name
     * @returns {boolean} Success status
     */
    setName(name) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            console.warn('⚠️ Invalid name provided');
            return false;
        }
        
        this.profile.name = name.trim();
        
        if (config.app.debug) {
            console.log(`✅ Set name: ${this.profile.name}`);
        }
        
        return true;
    }

    /**
     * Get the complete user profile
     * @returns {Object} Copy of the user profile
     */
    getProfile() {
        return { ...this.profile };
    }

    /**
     * Get a specific profile field
     * @param {string} field - Field name to retrieve
     * @returns {any} Field value or undefined
     */
    getField(field) {
        return this.profile[field];
    }

    /**
     * Check if the profile is complete (all required fields filled)
     * @returns {boolean} True if profile is complete
     */
    checkIfComplete() {
        const requiredFields = ['goals', 'level', 'equipment', 'time'];
        
        const isComplete = requiredFields.every(field => {
            const value = this.profile[field];
            
            // For arrays, check if not empty
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            
            // For strings, check if not empty
            return value && value.toString().trim().length > 0;
        });

        this.isComplete = isComplete;
        return isComplete;
    }

    /**
     * Mark profile as complete
     */
    markComplete() {
        this.isComplete = true;
        this.profile.completedAt = new Date().toISOString();
        
        if (config.app.debug) {
            console.log('🎉 Profile marked as complete');
        }
    }

    /**
     * Reset the profile to initial state
     */
    reset() {
        this.profile = {
            name: '',
            goals: [],
            level: '',
            equipment: [],
            time: '',
            preferences: {},
            completedAt: null
        };
        
        this.currentQuestionIndex = 0;
        this.isComplete = false;
        
        if (config.app.debug) {
            console.log('🔄 Profile reset');
        }
    }

    /**
     * Get a formatted summary of the user's profile
     * @returns {string} Human-readable profile summary
     */
    getSummary() {
        const profile = this.profile;
        
        if (!this.checkIfComplete()) {
            return 'Profile not yet completed';
        }

        const parts = [];
        
        if (profile.name) {
            parts.push(`Name: ${profile.name}`);
        }
        
        parts.push(`Goals: ${Array.isArray(profile.goals) ? profile.goals.join(', ') : profile.goals}`);
        parts.push(`Fitness Level: ${profile.level}`);
        parts.push(`Available Equipment: ${Array.isArray(profile.equipment) ? profile.equipment.join(', ') : profile.equipment}`);
        parts.push(`Workout Duration: ${profile.time}`);
        
        return parts.join('\n');
    }

    /**
     * Get profile data formatted for AI context
     * @returns {string} Profile formatted for AI system message
     */
    getAIContext() {
        const profile = this.profile;
        
        if (!this.checkIfComplete()) {
            return 'User profile not yet completed';
        }

        return `User Profile:
- Name: ${profile.name || 'Not provided'}
- Primary Goals: ${Array.isArray(profile.goals) ? profile.goals.join(', ') : profile.goals}
- Fitness Level: ${profile.level}
- Available Equipment: ${Array.isArray(profile.equipment) ? profile.equipment.join(', ') : profile.equipment}
- Preferred Workout Duration: ${profile.time}
- Profile Completed: ${profile.completedAt ? new Date(profile.completedAt).toLocaleDateString() : 'Unknown'}`;
    }

    /**
     * Get the current onboarding progress
     * @returns {Object} Progress information
     */
    getProgress() {
        const totalQuestions = config.onboarding.questions.length;
        const answeredQuestions = this.currentQuestionIndex;
        const progressPercent = Math.round((answeredQuestions / totalQuestions) * 100);
        
        return {
            currentQuestion: this.currentQuestionIndex + 1,
            totalQuestions,
            answeredQuestions,
            progressPercent,
            isComplete: this.isComplete,
            canGoBack: this.currentQuestionIndex > 0,
            canGoNext: this.hasNextQuestion()
        };
    }

    /**
     * Validate a specific answer format
     * @param {string} questionId - Question ID to validate
     * @param {any} answer - Answer to validate
     * @returns {Object} Validation result
     */
    validateAnswer(questionId, answer) {
        const question = config.onboarding.questions.find(q => q.id === questionId);
        
        if (!question) {
            return { valid: false, error: 'Question not found' };
        }

        // Check if answer is provided
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
            return { valid: false, error: 'Answer is required' };
        }

        // For select questions, check if answer is in options
        if (question.type === 'select') {
            if (!question.options.includes(answer)) {
                return { valid: false, error: 'Invalid option selected' };
            }
        }

        // For checkbox questions, check if all answers are valid options
        if (question.type === 'checkbox') {
            if (!Array.isArray(answer)) {
                return { valid: false, error: 'Multiple selections expected' };
            }
            
            const invalidOptions = answer.filter(opt => !question.options.includes(opt));
            if (invalidOptions.length > 0) {
                return { valid: false, error: `Invalid options: ${invalidOptions.join(', ')}` };
            }
        }

        return { valid: true };
    }

    /**
     * Get debug information
     * @returns {Object} Debug info
     */
    getDebugInfo() {
        return {
            profile: { ...this.profile },
            currentQuestionIndex: this.currentQuestionIndex,
            isComplete: this.isComplete,
            progress: this.getProgress(),
            currentQuestion: this.getCurrentQuestion()
        };
    }
}

export default UserProfile;