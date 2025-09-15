// Express server with OpenAI proxy
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load the environment variables from the .env file
dotenv.config();

// Create the Express application
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// CORS configuration with deployment option
const corsOptions = {
    origin: NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Request logging 
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'AI Gym Buddy API is running',
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, userProfile } = req.body;

        // Validate the message request
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid request",
                details: "Messages array is required"
            });
        }

        // Validate the API Key
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                success: false,
                error: "Server configuration error",
                details: "OpenAI API key is not configured"
            });
        }

        // Create personalized system prompt
        const systemMessage = {
            role: 'system',
            content: `You are an enthusiastic and knowledgeable AI fitness coach. Your name is "Gym Buddy".

USER PROFILE:
${userProfile ? `
- Goals: ${Array.isArray(userProfile.goals) ? userProfile.goals.join(', ') : userProfile.goals || 'General fitness'}
- Fitness Level: ${userProfile.level || 'Not specified'}
- Available Equipment: ${Array.isArray(userProfile.equipment) ? userProfile.equipment.join(', ') : userProfile.equipment || 'Not specified'}
- Workout Time: ${userProfile.time || 'Not specified'}
` : 'Profile not yet completed'}

INSTRUCTIONS:
- Provide personalized, actionable fitness advice based on their profile
- Be encouraging, motivational, and supportive
- Focus on practical workout suggestions they can actually do
- Give specific exercises when appropriate
- Keep responses conversational and engaging
- If they ask for workout plans, provide structured, detailed routines
- Always consider their fitness level and available equipment
- Promote safe exercise practices
- Keep responses under 300 words unless they specifically ask for detailed plans

Remember: You're their personal trainer and motivational coach!`
        };

        if (NODE_ENV === 'development') {
            console.log("📤 Sending request to OpenAI");
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [systemMessage, ...messages],
            max_tokens: 1000,
            temperature: 0.7
        });

        // FIXED: Extract content from the message object
        const aiResponse = completion.choices[0].message.content;
        
        if (NODE_ENV === 'development') {
            console.log("📥 Received response from OpenAI");
            console.log("🔍 AI Response Content:", aiResponse);
        }

        res.json({
            success: true,
            message: aiResponse, // Now returning the actual content string
            usage: completion.usage
        });

    } catch (error) {
        console.error('❌ OpenAI API error:', error);
        
        // Handle different types of errors
        if (error.status === 429) {
            return res.status(429).json({ 
                success: false,
                error: 'Rate limit exceeded', 
                details: 'Too many requests. Please try again later.' 
            });
        }
        
        if (error.status === 401) {
            return res.status(500).json({ 
                success: false,
                error: 'Authentication error', 
                details: 'Invalid API key configuration' 
            });
        }

        // Generic error response
        const errorResponse = {
            success: false,
            error: 'Failed to generate response',
            details: NODE_ENV === 'development' ? error.message : 'Please try again later'
        };

        res.status(500).json(errorResponse);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: NODE_ENV === 'development' ? err.message : 'Please try again later'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Not found',
        details: `Route ${req.originalUrl} not found`
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI Gym Buddy server running on port ${PORT}`);
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    
    if (NODE_ENV === 'development') {
        console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🤖 Chat endpoint: http://localhost:${PORT}/api/chat`);
    }
});