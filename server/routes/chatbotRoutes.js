import express from 'express';
import rateLimit from 'express-rate-limit';
import { handleChatMessage } from '../controllers/chatbotController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const chatbotRoutes = express.Router();

// Limit chatbot requests to prevent Gemini API cost abuse
const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 chatbot requests per 15 minutes
  message: {
    success: false,
    message: "Too many chatbot requests from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Public route that contextually personalizes responses if session cookie is present
chatbotRoutes.post('/message', chatbotLimiter, optionalAuth, handleChatMessage);

export default chatbotRoutes;
