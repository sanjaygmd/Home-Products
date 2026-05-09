import express from 'express';
import { handleChatMessage } from '../controllers/chatbotController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const chatbotRoutes = express.Router();

// Public route that contextually personalizes responses if session cookie is present
chatbotRoutes.post('/message', optionalAuth, handleChatMessage);

export default chatbotRoutes;
