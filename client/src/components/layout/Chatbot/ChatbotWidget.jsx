import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquare, Send, Trash2, X, Sparkles, Bot, Clock,
    ChevronRight, Compass, ShieldCheck, MapPin, Award, ArrowRight
} from 'lucide-react';
import { sendChatbotMessage } from '../../../services/chatbotService';
import { useAuth } from '../../../context/AuthContext';

const ChatbotWidget = () => {
    const { currentUser } = useAuth();
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

    // Dynamic helper to get localStorage key based on logged-in user
    const getStorageKey = () => {
        return currentUser ? `gmd_home_chat_history_${currentUser.id}` : null;
    };

    // Load message history from local storage on mount or user change
    useEffect(() => {
        const key = getStorageKey();
        if (key) {
            const cachedMessages = localStorage.getItem(key);
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
                localStorage.setItem(key, JSON.stringify([welcomeMsg]));
            }
        } else {
            // Guest users start with a clean welcoming message and no persistence
            const welcomeMsg = {
                role: 'model',
                text: "Hi there! 👋 I'm **GMD Home Assistant**, your personal interior design and shopping advisor. I can help you browse premium furniture, suggest kitchen & bedroom products, track your active orders, or answer delivery questions. How can I help elevate your space today?",
                timestamp: new Date().toISOString()
            };
            setMessages([welcomeMsg]);
        }
    }, [currentUser]);

    // Auto-scroll messages container to bottom on new messages or loading state
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading, isOpen]);

    // Save messages to local storage whenever they change, keeping only the last 20 messages to prevent unbounded growth
    const saveMessages = (newMessages) => {
        const cappedMessages = newMessages.slice(-20);
        setMessages(cappedMessages);
        
        const key = getStorageKey();
        if (key) {
            localStorage.setItem(key, JSON.stringify(cappedMessages));
        }
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

    // Advanced Rich Typography parsing for bespoke list visual styling
    const renderMessageText = (text) => {
        if (!text) return '';
        const lines = text.split('\n');
        
        return lines.map((line, lineIndex) => {
            const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
            const cleanLine = isBullet ? line.trim().slice(2) : line;

            // Split with Bold indicators **text**
            const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
            const renderedParts = parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={index} className="font-semibold text-[#e2c293] drop-shadow-[0_0_8px_rgba(226,194,147,0.15)]">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }

                // Match prices e.g. ₹5,000
                const priceRegex = /(₹\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g;
                if (priceRegex.test(part)) {
                    const priceParts = part.split(priceRegex);
                    return priceParts.map((pPart, pIdx) => {
                        if (pPart.startsWith('₹')) {
                            return (
                                <span key={pIdx} className="px-1.5 py-0.5 mx-0.5 rounded bg-[#e2c293]/15 text-[#e2c293] text-[12px] font-bold border border-[#e2c293]/20 shadow-sm inline-block">
                                    {pPart}
                                </span>
                            );
                        }
                        return pPart;
                    });
                }
                return part;
            });

            if (isBullet) {
                return (
                    <div key={lineIndex} className="flex items-start space-x-2 my-1.5 pl-1.5">
                        <span className="text-[#e2c293] mt-1.5 h-1.5 w-1.5 rounded-full bg-[#e2c293] shadow-[0_0_6px_rgba(226,194,147,0.8)] flex-shrink-0" />
                        <span className="text-neutral-100 text-[13px] leading-relaxed">{renderedParts}</span>
                    </div>
                );
            }

            return (
                <p key={lineIndex} className="text-[13px] text-neutral-200 leading-relaxed my-1">
                    {renderedParts}
                </p>
            );
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            <AnimatePresence>
                {/* 1. FLOATING CHAT BUTTON */}
                {!isOpen && (
                    <motion.button
                        onClick={() => setIsOpen(true)}
                        initial={{ scale: 0, rotate: -45, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: 45, opacity: 0 }}
                        whileHover={{ scale: 1.08, shadow: '0 15px 35px rgba(46,77,58,0.35)' }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: "spring", stiffness: 350, damping: 18 }}
                        className="relative flex items-center justify-center w-15 h-15 bg-gradient-to-tr from-[#0b1710] via-[#1c3a27] to-[#2e4d3a] border border-[#cbdcd0]/20 text-[#e2c293] rounded-full shadow-[0_12px_40px_rgba(7,14,10,0.45)] cursor-pointer focus:outline-none"
                        aria-label="Open GMD Concierge"
                    >
                        {/* Dynamic Radial Ripple */}
                        <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#1c3a27] to-[#e2c293] opacity-20 animate-ping duration-1500"></span>
                        
                        <MessageSquare className="w-6.5 h-6.5 relative z-10 text-[#e2c293]" />
                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-[#0b1710]"></span>
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {/* 2. CHAT PANEL WINDOW */}
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.94 }}
                        transition={{ type: "spring", stiffness: 280, damping: 22 }}
                        style={{ transformOrigin: "bottom right" }}
                        className="flex flex-col w-[390px] h-[600px] bg-[#070e0a]/95 backdrop-blur-xl border border-[#cbdcd0]/15 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden"
                    >
                        
                        {/* A. HEADER */}
                        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-b from-[#0f1d14] to-[#070e0a] border-b border-[#cbdcd0]/10 text-white relative">
                            {/* Accent Glow Background */}
                            <div className="absolute top-0 left-1/4 right-1/4 h-8 bg-[#528c68]/15 blur-2xl rounded-full pointer-events-none"></div>

                            <div className="flex items-center space-x-3.5 relative z-10">
                                {/* Cyber-Luxe Avatar */}
                                <div className="relative w-10 h-10 rounded-2xl bg-[#0f1d14] border border-[#cbdcd0]/15 flex items-center justify-center shadow-lg">
                                    <Bot className="w-5.5 h-5.5 text-[#e2c293]" />
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border border-[#070e0a] rounded-full"></span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[14px] text-white tracking-wide flex items-center gap-1.5">
                                        GMD Concierge
                                        <Sparkles className="w-3.5 h-3.5 text-[#e2c293] animate-pulse" />
                                    </h3>
                                    <p className="text-[10px] text-[#cbdcd0]/60 flex items-center gap-1 mt-0.5">
                                        <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                        <span>AI Design Specialist</span>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 relative z-10">
                                {/* Clear Chat */}
                                <motion.button 
                                    onClick={handleClearChat}
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(226,194,147,0.08)' }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 rounded-xl text-[#cbdcd0]/60 hover:text-[#e2c293] transition-colors duration-150 focus:outline-none cursor-pointer"
                                    title="Reset Chat"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </motion.button>
                                {/* Close Panel */}
                                <motion.button
                                    onClick={() => setIsOpen(false)}
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 rounded-xl text-[#cbdcd0]/60 hover:text-white transition-colors duration-150 focus:outline-none cursor-pointer"
                                    title="Minimize"
                                >
                                    <X className="w-4.5 h-4.5" />
                                </motion.button>
                            </div>
                        </div>

                        {/* B. DYNAMIC CONTENT CONTAINER */}
                        <div className="flex-grow p-6 overflow-y-auto space-y-5 bg-[#070e0a] no-scrollbar">
                            
                            {/* Rich Welcoming Dashboard when no custom messages exist */}
                            {messages.length <= 1 && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-5"
                                >
                                    {/* Glass Greeting Banner */}
                                    <div className="p-5 rounded-2xl bg-gradient-to-tr from-[#0f1d14] to-[#122419] border border-[#cbdcd0]/10 shadow-inner relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#e2c293]/5 blur-xl rounded-full"></div>
                                        <h4 className="text-[13px] font-medium text-[#cbdcd0]/80">PREMIUM CUSTOMER SERVICE</h4>
                                        <h2 className="text-xl font-semibold text-white mt-1 leading-tight tracking-wide">
                                            Elevate Your Space <span className="text-[#e2c293]">With AI</span>
                                        </h2>
                                        <p className="text-[12px] text-[#cbdcd0]/70 mt-2.5 leading-relaxed">
                                            Welcome to GMD Luxe Assistant. I can recommend premium decor arrangements, track your current orders, or guide you through return logistics.
                                        </p>
                                    </div>

                                    {/* Dashboard Grid Header */}
                                    <div className="flex items-center space-x-2 text-[#e2c293]">
                                        <Compass className="w-4 h-4" />
                                        <span className="text-[11px] font-bold tracking-wider uppercase">Direct Access Concierge</span>
                                    </div>

                                    {/* Interactive Grid Cards */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <motion.button
                                            onClick={() => handleSendMessage("Recommend furniture and suggest home decor")}
                                            whileHover={{ scale: 1.03, backgroundColor: '#0f1d14', borderColor: '#e2c293/30' }}
                                            whileTap={{ scale: 0.97 }}
                                            className="flex flex-col items-start p-4 bg-[#0a140f] border border-[#cbdcd0]/5 rounded-2xl text-left cursor-pointer transition-all shadow-sm"
                                        >
                                            <div className="p-2 rounded-xl bg-[#e2c293]/10 text-[#e2c293] mb-3">
                                                <Compass className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-semibold text-white">Suggest Decor</span>
                                            <span className="text-[9px] text-[#cbdcd0]/50 mt-1 leading-normal">Suggest curated aesthetic products</span>
                                        </motion.button>

                                        <motion.button
                                            onClick={() => handleSendMessage("Track my active order")}
                                            whileHover={{ scale: 1.03, backgroundColor: '#0f1d14', borderColor: '#e2c293/30' }}
                                            whileTap={{ scale: 0.97 }}
                                            className="flex flex-col items-start p-4 bg-[#0a140f] border border-[#cbdcd0]/5 rounded-2xl text-left cursor-pointer transition-all shadow-sm"
                                        >
                                            <div className="p-2 rounded-xl bg-[#e2c293]/10 text-[#e2c293] mb-3">
                                                <MapPin className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-semibold text-white">Track Order</span>
                                            <span className="text-[9px] text-[#cbdcd0]/50 mt-1 leading-normal">Live delivery tracking status updates</span>
                                        </motion.button>

                                        <motion.button
                                            onClick={() => handleSendMessage("What is your return policy?")}
                                            whileHover={{ scale: 1.03, backgroundColor: '#0f1d14', borderColor: '#e2c293/30' }}
                                            whileTap={{ scale: 0.97 }}
                                            className="flex flex-col items-start p-4 bg-[#0a140f] border border-[#cbdcd0]/5 rounded-2xl text-left cursor-pointer transition-all shadow-sm"
                                        >
                                            <div className="p-2 rounded-xl bg-[#e2c293]/10 text-[#e2c293] mb-3">
                                                <ShieldCheck className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-semibold text-white">Return Policy</span>
                                            <span className="text-[9px] text-[#cbdcd0]/50 mt-1 leading-normal">Learn about 15-day refund policy</span>
                                        </motion.button>

                                        <motion.button
                                            onClick={() => handleSendMessage("What are the trending designs available?")}
                                            whileHover={{ scale: 1.03, backgroundColor: '#0f1d14', borderColor: '#e2c293/30' }}
                                            whileTap={{ scale: 0.97 }}
                                            className="flex flex-col items-start p-4 bg-[#0a140f] border border-[#cbdcd0]/5 rounded-2xl text-left cursor-pointer transition-all shadow-sm"
                                        >
                                            <div className="p-2 rounded-xl bg-[#e2c293]/10 text-[#e2c293] mb-3">
                                                <Award className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs font-semibold text-white">Trending Releases</span>
                                            <span className="text-[9px] text-[#cbdcd0]/50 mt-1 leading-normal">Browse most popular releases</span>
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Standard message lists if they exceed welcome state */}
                            {messages.length > 1 && (
                                <div className="space-y-4">
                                    <AnimatePresence initial={false}>
                                        {messages.map((msg, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                    <div
                                                        className={`px-4.5 py-3 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap break-words transition-all ${
                                                            msg.role === 'user'
                                                                ? 'bg-gradient-to-tr from-[#1c3a27] to-[#2e4d3a] text-[#f3f6f4] border border-[#cbdcd0]/10 rounded-tr-none shadow-[0_4px_15px_rgba(28,58,39,0.2)]'
                                                                : 'bg-[#0f1d14] text-neutral-200 border border-[#cbdcd0]/10 rounded-tl-none border-l-4 border-l-[#e2c293] shadow-inner'
                                                        }`}
                                                    >
                                                        {renderMessageText(msg.text)}
                                                    </div>
                                                    <span className="text-[10px] text-[#cbdcd0]/45 mt-1.5 px-1 flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-[#cbdcd0]/30" />
                                                        <span>{formatTime(msg.timestamp)}</span>
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Animated Typing Indicator */}
                            {isLoading && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start"
                                >
                                    <div className="flex flex-col items-start max-w-[80%]">
                                        <div className="px-4 py-2.5 bg-[#0f1d14] text-[#cbdcd0]/40 border border-[#cbdcd0]/10 rounded-2xl rounded-tl-none flex items-center space-x-1.5 shadow-inner">
                                            <span className="w-1.5 h-1.5 bg-[#e2c293] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-[#e2c293]/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-[#e2c293]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* C. FOOTER WITH SUGGESTED REPLIES & INPUT */}
                        <div className="p-4.5 bg-[#0f1d14]/75 border-t border-[#cbdcd0]/10 backdrop-blur-md">
                            
                            {/* Horizontal Interactive Suggestions */}
                            {suggestedReplies.length > 0 && (
                                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-3.5 no-scrollbar scroll-smooth">
                                    {suggestedReplies.map((reply, index) => (
                                        <motion.button
                                            key={index}
                                            onClick={() => handleSendMessage(reply.replace(/^[🎁📦💬🔍🛋️🔙]\s*/, ""))}
                                            whileHover={{ scale: 1.03, backgroundColor: 'rgba(226,194,147,0.1)', borderColor: '#e2c293/50' }}
                                            whileTap={{ scale: 0.97 }}
                                            className="px-3.5 py-1.5 text-[11px] font-semibold text-[#e2c293] bg-[#070e0a] border border-[#cbdcd0]/15 rounded-xl cursor-pointer flex items-center gap-1 focus:outline-none flex-shrink-0 transition-all shadow-sm"
                                            disabled={isLoading}
                                        >
                                            <span>{reply}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            )}

                            {/* Character Count & Text Input Box */}
                            <div className="relative">
                                <div className="flex items-center space-x-2 bg-[#070e0a] border border-[#cbdcd0]/10 rounded-xl px-4 py-3 focus-within:border-[#e2c293]/50 focus-within:ring-4 focus-within:ring-[#e2c293]/5 transition-all duration-300">
                                    <input
                                        type="text"
                                        placeholder="Ask GMD Concierge..."
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyPress}
                                        maxLength={500}
                                        className="flex-grow bg-transparent border-none text-[13px] text-neutral-100 focus:outline-none focus:ring-0 placeholder-neutral-500 py-0.5"
                                        disabled={isLoading}
                                    />
                                    
                                    {/* Visual Character Circular Gauge */}
                                    {inputValue.length > 0 && (
                                        <span className={`text-[9px] font-bold ${
                                            inputValue.length > 400 ? 'text-rose-500 animate-pulse' : 'text-[#cbdcd0]/40'
                                        }`}>
                                            {inputValue.length}/500
                                        </span>
                                    )}

                                    {/* Glass Send Button */}
                                    <motion.button
                                        onClick={() => handleSendMessage()}
                                        disabled={isLoading || !inputValue.trim()}
                                        whileHover={inputValue.trim() && !isLoading ? { scale: 1.08, backgroundColor: '#e2c293', color: '#070e0a' } : {}}
                                        whileTap={inputValue.trim() && !isLoading ? { scale: 0.92 } : {}}
                                        className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                                            inputValue.trim() && !isLoading
                                                ? 'bg-[#0f1d14] text-[#e2c293] border border-[#e2c293]/30 shadow-sm'
                                                : 'text-[#cbdcd0]/20 cursor-not-allowed'
                                        }`}
                                        aria-label="Send query"
                                    >
                                        <Send className="w-4 h-4" />
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatbotWidget;
