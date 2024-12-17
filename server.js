import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS to allow requests from your frontend
app.use(cors({
    origin: ['https://dreamlabssol.com', 'https://www.dreamlabssol.com', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Enhanced logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Request headers:', req.headers);
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Get API key from environment variable
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

if (!REPLICATE_API_KEY) {
    console.error('ERROR: REPLICATE_API_KEY environment variable is not set');
    process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Create prediction
app.post('/api/predictions', async (req, res) => {
    try {
        console.log('Making prediction request with body:', JSON.stringify(req.body, null, 2));

        // Validate request body
        if (!req.body.version || !req.body.input || !req.body.input.prompt) {
            throw new Error('Invalid request body: missing required fields');
        }

        // Set timeout for fetch request
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            const response = await fetch("https://api.replicate.com/v1/predictions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Token ${REPLICATE_API_KEY}`,
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    version: req.body.version,
                    input: {
                        prompt: req.body.input.prompt,
                        num_frames: req.body.input.num_frames || 24,
                        fps: req.body.input.fps || 8
                    }
                }),
                signal: controller.signal
            });

            clearTimeout(timeout);
            
            const data = await response.json();
            console.log('Replicate API response:', JSON.stringify(data, null, 2));

            if (!response.ok) {
                console.error('Replicate API error:', data);
                let errorMessage;
                if (data.detail && data.detail.includes('Invalid API token')) {
                    errorMessage = 'Invalid API key. Please check your Replicate API key in the .env file.';
                } else {
                    errorMessage = data.detail || 'Failed to create prediction';
                }
                return res.status(response.status).json({
                    error: errorMessage,
                    userMessage: errorMessage
                });
            }

            if (!data.id) {
                console.error('No prediction ID in response:', data);
                return res.status(500).json({
                    error: 'Invalid API response: missing prediction ID',
                    userMessage: 'Failed to start generation. Please try again.'
                });
            }

            res.json(data);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error creating prediction:', error);
        res.status(500).json({ 
            error: error.message,
            userMessage: 'Failed to generate dream. Please try again later.'
        });
    }
});

// Get prediction status
app.get('/api/predictions/:id', async (req, res) => {
    try {
        if (!req.params.id) {
            throw new Error('Missing prediction ID');
        }

        console.log('Checking prediction status for ID:', req.params.id);
        
        // Set timeout for fetch request
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            const response = await fetch(
                `https://api.replicate.com/v1/predictions/${req.params.id}`,
                {
                    headers: {
                        "Authorization": `Token ${REPLICATE_API_KEY}`,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    signal: controller.signal
                }
            );

            clearTimeout(timeout);
            
            const data = await response.json();
            console.log('Prediction status response:', JSON.stringify(data, null, 2));

            if (!response.ok) {
                console.error('Replicate API error:', data);
                const errorMessage = data.detail || 'Failed to get prediction status';
                return res.status(response.status).json({
                    error: errorMessage,
                    userMessage: 'Failed to check dream status. Please try again.'
                });
            }

            // Check if the prediction is stuck
            if (data.status === 'starting' && 
                new Date() - new Date(data.created_at) > 30000) { // 30 seconds
                return res.status(500).json({
                    error: 'Prediction stuck in starting state',
                    userMessage: 'Generation is taking too long. Please try again.'
                });
            }

            res.json(data);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error checking prediction status:', error);
        res.status(500).json({ 
            error: error.message,
            userMessage: 'Failed to check dream status. Please try again.'
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        userMessage: 'An unexpected error occurred. Please try again later.',
        details: err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using Replicate API key: ${REPLICATE_API_KEY ? '✓ Set' : '✗ Missing'}`);
});
