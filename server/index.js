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
        ? process.env.FRONTEND_URL // Use your frontend URL in production
        : 'http://localhost:4000', // Local development frontend URL
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Request logging 
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next()
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
    } catch (error) {

    }
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