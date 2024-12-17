# ADreamlab Server

Backend server for ADreamlab video generation using Replicate API.

## Setup

1. Clone this repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file with your Replicate API key:
```
REPLICATE_API_KEY=your_api_key_here
```

## Development

Run the server locally:
```bash
npm run dev
```

The server will start on http://localhost:3000

## Deployment

This server can be deployed to platforms like Render or Heroku. Make sure to:

1. Set the `REPLICATE_API_KEY` environment variable in your deployment platform
2. The server will automatically use the `PORT` environment variable provided by the platform

### Deployment to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add the `REPLICATE_API_KEY` environment variable
5. Deploy!

## API Endpoints

### Health Check
```
GET /health
```

### Create Prediction
```
POST /api/predictions
Content-Type: application/json

{
    "version": "9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
    "input": {
        "prompt": "your dream description",
        "num_frames": 24,
        "fps": 8
    }
}
```

### Get Prediction Status
```
GET /api/predictions/:id
```

## CORS Configuration

The server is configured to accept requests from:
- https://adreamlab.netlify.app
- http://localhost:5500
- http://127.0.0.1:5500

## Error Handling

The server includes comprehensive error handling for:
- API timeouts
- Invalid API keys
- Stuck predictions
- Network errors

## Environment Variables

- `PORT`: Server port (default: 3000)
- `REPLICATE_API_KEY`: Your Replicate API key (required)
