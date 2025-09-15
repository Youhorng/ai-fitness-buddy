// Manage user stage and progression through different stages of interaction
// Stages: Welcome, Onboarding, Summary, Chatting

import config from '../config.js';

class StageManager {
    constructor() {
        this.currentStage = config.stages.WELCOME;
        this.stageHistory = [];
        this.listeners = new Set();
        this.isTransitioning = false;

        if (config.app.debug) {
            console.log(`StageManager initialized at stage: ${this.currentStage}`);
        }
    }

    // Get the current stage
    getCurrentStage() {
        return this.currentStage;
    }

    // Set a new stage
    setStage(newStage, saveToHistory = true) {
        // 1. Validate the stage exists
        if (!Object.values(config.stages).includes(newStage)) {
            console.error(`Invalid stage: ${newStage}`);
            return false;
        }

        // 2. Prevent double transitions
        if (this.isTransitioning) {
            console.warn('Already transitioning');
            return false;
        }

        // 3. Don't change to same stage
        if (this.currentStage === newStage) {
            return true;
        }

        this.isTransitioning = true;

        // 4. Save current stage to history (for back button)
        if (saveToHistory) {
            this.stageHistory.push(this.currentStage);
        }

        // 5. Actually change the stage
        const previousStage = this.currentStage;
        this.currentStage = newStage;

        // 6. Tell everyone about the change
        this.notifyListeners(newStage, previousStage);

        this.isTransitioning = false;
        return true;
    }

    // Go back to the previous stage
    goBack() {
        // 1. Check if there's a previous stage
        if (this.stageHistory.length === 0) {
            console.warn('No previous stage to go back to');
            return false;
        }

        // 2. Get the last stage and go there (don't save to history)
        const previousStage = this.stageHistory.pop();
        return this.setStage(previousStage, false);
    }

    // Navigate to next stage
    nextStage() {
        // Define the flow: what comes after what
        const stageFlow = {
            [config.stages.WELCOME]: config.stages.ONBOARDING,
            [config.stages.ONBOARDING]: config.stages.SUMMARY,
            [config.stages.SUMMARY]: config.stages.CHATTING
        };

        const nextStage = stageFlow[this.currentStage];
        if (nextStage) {
            return this.setStage(nextStage);
        }

        console.warn(`No next stage for: ${this.currentStage}`);
        return false;
    }

    // Reset stage
    reset() {
        this.stageHistory = [];
        this.setStage(config.stages.WELCOME, false);
        console.log('Reset to welcome stage');
    }

    // Add listener for stage changes
    addListener(callback) {
        if (typeof callback !== 'function') {
            console.error('Listener must be a function');
            return () => {};
        }

        this.listeners.add(callback);

        // Return function to unsubscribe
        return () => {
            this.listeners.delete(callback);
        };
    }

    // Remove listener
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    // Notify listeners of stage change
    notifyListeners(newStage, previousStage) {
        // Call every function that's listening for changes
        this.listeners.forEach(callback => {
            try {
                callback(newStage, previousStage);
            } catch (error) {
                console.error('Error in listener:', error);
            }
        });
    }

    // Get stage progression info
    getStageInfo() {
        const stages = Object.values(config.stages);
        const currentIndex = stages.indexOf(this.currentStage);
        
        return {
            currentStage: this.currentStage,
            currentIndex,
            totalStages: stages.length,
            progress: Math.round(((currentIndex + 1) / stages.length) * 100),
            canGoBack: this.stageHistory.length > 0,
            canGoNext: currentIndex < stages.length - 1,
            history: [...this.stageHistory]
        };
    }

    // Check if we can navigate to a specific stage
    canNavigateTo(stage) {
        // Can always go back to previous stages
        if (this.stageHistory.includes(stage)) {
            return true;
        }

        // Define stage order
        const stageOrder = [
            config.stages.WELCOME,
            config.stages.ONBOARDING,
            config.stages.SUMMARY,
            config.stages.CHATTING
        ];

        const currentIndex = stageOrder.indexOf(this.currentStage);
        const targetIndex = stageOrder.indexOf(stage);

        // Can only go one stage forward
        return targetIndex <= currentIndex + 1;
    }

    // Get debug info
    getDebugInfo() {
        return {
            currentStage: this.currentStage,
            history: [...this.stageHistory],
            listeners: this.listeners.size,
            isTransitioning: this.isTransitioning,
            stageInfo: this.getStageInfo()
        };
    }
}

export default StageManager;