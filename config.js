// Configuration of the application
const config = {
    // API Configuration
    api: {
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api', // Fixed port to match backend
        endpoints: {
            chat: '/chat',
            health: '/health',
        }
    },

    // App metadata
    app: {
        name: 'AI Gym Buddy', // Fixed typo (removed extra space)
        version: '1.0.0',
        debug: import.meta.env.VITE_DEV === 'true' ?? true
    },

    // App stages for stage management
    stages: {
        WELCOME: 'welcome',
        ONBOARDING: 'onboarding',
        SUMMARY: 'summary',
        CHATTING: 'chatting'   
    },

    // Onboarding questions (can render dynamically)
    onboarding: {
        questions: [
          {
            id: 'goals',
            type: 'select',
            question: 'What are your primary fitness goals?',
            options: ['Weight Loss', 'Muscle Building', 'General Fitness', 'Strength Training', 'Endurance']
          },
          {
            id: 'level',
            type: 'select',
            question: 'What is your current fitness level?',
            options: ['Beginner', 'Intermediate', 'Advanced']
          },
          {
            id: 'equipment',
            type: 'checkbox',
            question: 'What equipment do you have access to?',
            options: ['Gym Membership', 'Home Weights', 'Resistance Bands', 'No Equipment']
          },
          {
            id: 'time',
            type: 'select',
            question: 'How much time can you dedicate per workout?',
            options: ['15-30 minutes', '30-45 minutes', '45-60 minutes', '60+ minutes']
          }
        ]
    }    
};

export default config;