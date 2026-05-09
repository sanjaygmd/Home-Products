import { api } from "./api.js";

/**
 * Sends a chat message to the backend chatbot route along with chat history.
 * @param {string} message - The current message typed by the user.
 * @param {Array} history - Array of previous messages in format [{ role: 'user' | 'model', content: string }]
 * @returns {Promise<Object>} API response including the AI reply and suggested replies.
 */
export const sendChatbotMessage = async (message, history = []) => {
    try {
        const response = await api.post(`/chatbot/message`, { message, history });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : error;
    }
};
