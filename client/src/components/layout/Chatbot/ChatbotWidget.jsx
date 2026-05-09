import React, { useState, useEffect, useRef } from 'react';
import { sendChatbotMessage } from '../../../services/chatbotService';

const ChatbotWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestedReplies, setSuggestedReplies] = useState([
        "🛋️ Suggest home decor",
        "📦 Track my order",
        "💬 What is your return policy?"
    ]);

    const messagesEndRef = useRef(null);

    // Load message history from local storage on mount
    useEffect(() => {
        const cachedMessages = localStorage.getItem('gmd_home_chat_history');
        if (cachedMessages) {
            setMessages(JSON.parse(cachedMessages));
        } else {
            // Initial welcoming message
            const welcomeMsg = {
                role: 'model',
                text: "Hi there! 👋 I'm **GMD Home Assistant**, your personal interior design and shopping advisor. I can help you browse premium furniture, suggest kitchen & bedroom products, track your active orders, or answer delivery questions. How can I help elevate your space today?",
                timestamp: new Date().toISOString()
            };
            setMessages([welcomeMsg]);
            localStorage.setItem('gmd_home_chat_history', JSON.stringify([welcomeMsg]));
        }
    }, []);

    // Auto-scroll messages container to bottom on new messages or loading state
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading, isOpen]);

    // Save messages to local storage whenever they change
    const saveMessages = (newMessages) => {
        setMessages(newMessages);
        localStorage.setItem('gmd_home_chat_history', JSON.stringify(newMessages));
    };

    const handleSendMessage = async (textToSend) => {
        const query = textToSend || inputValue.trim();
        if (!query) return;

        // Add user message to state
        const userMsg = {
            role: 'user',
            text: query,
            timestamp: new Date().toISOString()
        };

        const updatedMessages = [...messages, userMsg];
        saveMessages(updatedMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            // Map history format: { role: 'user' | 'model', content: string }
            const historyForAPI = updatedMessages.map(msg => ({
                role: msg.role,
                content: msg.text
            }));

            const response = await sendChatbotMessage(query, historyForAPI);

            if (response && response.success) {
                const botMsg = {
                    role: 'model',
                    text: response.reply,
                    timestamp: new Date().toISOString()
                };
                saveMessages([...updatedMessages, botMsg]);
                
                // Update dynamic quick suggested replies
                if (response.suggestedReplies && response.suggestedReplies.length > 0) {
                    setSuggestedReplies(response.suggestedReplies);
                } else {
                    setSuggestedReplies(["🛋️ Recommend furniture", "📦 Track Order", "🔙 Main Menu"]);
                }
            }
        } catch (error) {
            console.error("Chatbot response error:", error);
            const errorMsg = {
                role: 'model',
                text: "I'm having a little trouble connecting to my server right now. Please make sure your server is running or try again in a moment!",
                timestamp: new Date().toISOString()
            };
            saveMessages([...updatedMessages, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    const handleClearChat = () => {
        const welcomeMsg = {
            role: 'model',
            text: "Welcome back! Let's find some beautiful products for your home! 🏠",
            timestamp: new Date().toISOString()
        };
        saveMessages([welcomeMsg]);
        setSuggestedReplies([
            "🛋️ Suggest home decor",
            "📦 Track my order",
            "💬 What is your return policy?"
        ]);
    };

    // Helper to format timestamps nicely
    const formatTime = (isoString) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    // Helper to render markdown bolding/emojis nicely in messages
    const renderMessageText = (text) => {
        if (!text) return '';
        // Replace simple **text** with bold tags
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-semibold text-neutral-900 dark:text-neutral-100">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* 1. FLOATING CHAT BUTTON */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-rose-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 group"
                    aria-label="Open GMD Assistant Chat"
                >
                    {/* Pulsing Backing Wave */}
                    <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 opacity-40 animate-ping group-hover:opacity-60 duration-1000"></span>
                    
                    {/* Main Chat Icon SVG */}
                    <svg className="w-7 h-7 relative z-10 transition-transform duration-300 group-hover:rotate-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    
                    {/* Unread dot indicator */}
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full"></span>
                </button>
            )}

            {/* 2. CHAT PANEL WINDOW */}
            {isOpen && (
                <div className="flex flex-col w-[380px] h-[550px] bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden animate-slide-up duration-300">
                    
                    {/* A. HEADER */}
                    <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-md">
                        <div className="flex items-center space-x-3">
                            {/* Avatar */}
                            <div className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg backdrop-blur-md">
                                🏠
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-indigo-600 rounded-full"></span>
                            </div>
                            <div>
                                <h3 className="font-semibold tracking-wide text-sm">GMD Home Assistant</h3>
                                <p className="text-[11px] text-white/80 flex items-center space-x-1">
                                    <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    <span>AI Assistant • Active</span>
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                            {/* Clear History Button */}
                            <button 
                                onClick={handleClearChat}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors duration-200"
                                title="Clear Conversation"
                            >
                                <svg className="w-5 h-5 opacity-80 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            {/* Close Panel Button */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors duration-200"
                                title="Close Chat"
                            >
                                <svg className="w-6 h-6 opacity-80 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* B. MESSAGE CONTAINER */}
                    <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-neutral-50/50">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div
                                        className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                                            msg.role === 'user'
                                                ? 'bg-gradient-to-tr from-rose-500 to-indigo-600 text-white rounded-tr-none'
                                                : 'bg-white text-neutral-800 border border-neutral-100 rounded-tl-none'
                                        }`}
                                    >
                                        {renderMessageText(msg.text)}
                                    </div>
                                    <span className="text-[10px] text-neutral-400 mt-1 px-1">
                                        {formatTime(msg.timestamp)}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Animated Loading/Typing Bubble */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex flex-col items-start max-w-[80%]">
                                    <div className="px-4 py-3 bg-white text-neutral-500 border border-neutral-100 rounded-2xl rounded-tl-none flex items-center space-x-1 shadow-sm">
                                        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* C. FOOTER WITH SUGGESTED REPLIES & INPUT */}
                    <div className="p-3 border-t border-neutral-100 bg-white">
                        
                        {/* Interactive Suggestion Chips */}
                        {suggestedReplies.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-[72px] overflow-y-auto no-scrollbar">
                                {suggestedReplies.map((reply, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSendMessage(reply.replace(/^[🎁📦💬🔍🛋️🔙]\s*/, ""))}
                                        className="px-3 py-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-100 rounded-full transition-colors duration-200"
                                        disabled={isLoading}
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Text Input Box */}
                        <div className="flex items-center space-x-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                            <input
                                type="text"
                                placeholder="Ask about home decor, track orders..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="flex-grow bg-transparent border-none text-xs text-neutral-800 focus:outline-none focus:ring-0 placeholder-neutral-400 py-1"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={isLoading || !inputValue.trim()}
                                className={`p-1.5 rounded-lg transition-all duration-200 ${
                                    inputValue.trim() && !isLoading
                                        ? 'bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-sm hover:scale-105'
                                        : 'text-neutral-300 cursor-not-allowed'
                                }`}
                                aria-label="Send Message"
                            >
                                <svg className="w-4.5 h-4.5 transform rotate-45 -translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default ChatbotWidget;
