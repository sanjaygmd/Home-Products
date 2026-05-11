import express from 'express';
import rateLimit from 'express-rate-limit';
import { handleChatMessage } from '../controllers/chatbotController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const chatbotRoutes = express.Router();

// Strict rate limiter for anonymous/guest users to prevent Gemini API cost abuse
const guestChatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Guests are strictly limited to 5 queries per 15 minutes
  message: {
    success: false,
    message: "Too many chatbot requests from this anonymous session. Please log in or try again in 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

// Rate limiter for logged-in users
const authenticatedChatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Authenticated users can send up to 20 queries per 15 minutes
  message: {
    success: false,
    message: "Too many chatbot requests. Please try again in 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

// Middleware to dynamically select the limiter based on auth status
const dynamicChatbotLimiter = (req, res, next) => {
  if (req.user) {
    return authenticatedChatbotLimiter(req, res, next);
  } else {
    return guestChatbotLimiter(req, res, next);
  }
};

// Public route that contextually personalizes responses if session cookie is present
chatbotRoutes.post('/message', optionalAuth, dynamicChatbotLimiter, handleChatMessage);

export default chatbotRoutes;
