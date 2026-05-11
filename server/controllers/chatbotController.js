import { pool } from '../configs/db.js';
import crypto from 'crypto';

// Dynamic Gemini Client Loader to prevent startup crashes if package is missing or API key is absent
let genAI = null;
const getGeminiClient = async () => {
    if (genAI) return genAI;
    if (!process.env.GEMINI_API_KEY) {
        console.warn("[WARNING] GEMINI_API_KEY is not defined in environment variables.");
        return null;
    }
    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        return genAI;
    } catch (err) {
        console.warn("[CHATBOT WARNING] @google/generative-ai package is not installed. Please run 'npm install' inside the server folder.");
        return null;
    }
};

/**
 * Handles incoming chatbot messages.
 * POST /chatbot/message
 */
export const handleChatMessage = async (req, res, next) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ success: false, message: "Message is required and must be a string." });
        }

        if (message.trim().length > 500) {
            return res.status(400).json({ success: false, message: "Message exceeds maximum length of 500 characters." });
        }

        let sessionId = req.user ? req.user.id : req.cookies?.guest_session_id;
        let isNewGuestSession = false;
        if (!sessionId) {
            sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
            isNewGuestSession = true;
        }

        if (isNewGuestSession) {
            res.cookie('guest_session_id', sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000, // 1 day
                sameSite: 'lax',
                path: '/'
            });
        }

        // 1. Fetch Store Context from PostgreSQL Database with defensive try/catch blocks
        let categoriesList = [];
        try {
            // Retrieve active categories
            const categoriesResult = await pool.query(
                "SELECT name, slug FROM categories WHERE is_active = true LIMIT 10"
            );
            categoriesList = categoriesResult.rows;
        } catch (catErr) {
            console.warn("[CHATBOT WARNING] Failed to fetch categories:", catErr.message);
        }

        let productsList = [];
        try {
            // Safely fetch products catalog with defensive column queries
            const productsResult = await pool.query(`
                SELECT p.product_id, p.name, p.price, p.brand, p.color, p.size, p.room, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.category_id
                WHERE p.is_active = true AND p.deleted_at IS NULL
                ORDER BY p.created_at DESC
                LIMIT 25
            `);
            productsList = productsResult.rows;
        } catch (prodErr) {
            console.warn("[CHATBOT WARNING] Failed to fetch products catalog:", prodErr.message);
            // Fallback product search in case columns are missing
            try {
                const fallbackResult = await pool.query(`
                    SELECT p.product_id, p.name, p.price 
                    FROM products p
                    WHERE p.is_active = true AND p.deleted_at IS NULL
                    LIMIT 15
                `);
                productsList = fallbackResult.rows;
            } catch (fallbackErr) {
                console.error("[CHATBOT ERROR] Fatal product retrieval fallback failed:", fallbackErr.message);
            }
        }

        // 2. Fetch Customer Context if Authenticated
        let customerProfile = null;
        let recentOrders = [];

        if (req.user) {
            try {
                // Fetch fresh customer details
                const customerResult = await pool.query(
                    "SELECT customer_id, full_name, email, phone FROM customers WHERE customer_id = $1 AND is_active = true",
                    [req.user.id]
                );
                if (customerResult.rows.length > 0) {
                    customerProfile = customerResult.rows[0];
                }
            } catch (custErr) {
                console.warn("[CHATBOT WARNING] Failed to fetch customer profile context:", custErr.message);
            }

            try {
                // Fetch customer's recent orders with delivery statuses if available
                const ordersResult = await pool.query(`
                    SELECT o.order_id, o.total_amount, o.order_status, o.placed_at, 
                           d.shipping_status, d.courier_name, d.awb_code
                    FROM orders o
                    LEFT JOIN deliveries d ON o.order_id = d.order_id
                    WHERE o.customer_id = $1 AND o.is_deleted = false
                    ORDER BY o.placed_at DESC
                    LIMIT 5
                `, [req.user.id]);
                recentOrders = ordersResult.rows;
            } catch (orderErr) {
                console.warn("[CHATBOT WARNING] Failed to fetch recent orders with deliveries:", orderErr.message);
                // Fallback to query orders only (without left joining deliveries)
                try {
                    const fallbackOrdersResult = await pool.query(`
                        SELECT o.order_id, o.total_amount, o.order_status, o.placed_at
                        FROM orders o
                        WHERE o.customer_id = $1 AND o.is_deleted = false
                        ORDER BY o.placed_at DESC
                        LIMIT 5
                    `, [req.user.id]);
                    recentOrders = fallbackOrdersResult.rows;
                } catch (fallbackOrderErr) {
                    console.error("[CHATBOT ERROR] Fatal orders fallback failed:", fallbackOrderErr.message);
                }
            }
        }

        // 3. Format Context and Instructions dynamically based on Authenticated User Role
        let systemInstruction = "";
        const userRole = req.user ? req.user.type : 'guest';

        if (userRole === 'seller') {
            // Retrieve seller context
            let sellerProfile = null;
            let sellerProducts = [];
            try {
                const sellerRes = await pool.query(`
                    SELECT s.seller_id, s.store_name, s.rating, s.commission_rate, s.is_verified
                    FROM sellers s
                    WHERE s.seller_id = $1
                `, [req.user.id]);
                if (sellerRes.rows.length > 0) {
                    sellerProfile = sellerRes.rows[0];
                }
                
                const sellerProdRes = await pool.query(`
                    SELECT product_id, name, price, stock, is_active
                    FROM products
                    WHERE seller_id = $1 AND deleted_at IS NULL
                    LIMIT 10
                `, [req.user.id]);
                sellerProducts = sellerProdRes.rows;
            } catch (err) {
                console.warn("[CHATBOT WARNING] Failed to fetch seller context:", err.message);
            }

            systemInstruction = `
You are "GMD Merchant Coach", an encouraging, professional, and data-driven seller growth advisor for GMD Home-Products sellers.
Your goal is to help GMD merchants maximize their sales, understand system fees, optimize product listings, and explain platform seller policies.

---
STRICT BOUNDARIES:
1. FEE EXPLANATION: Explain GMD seller commissions. Our standard default platform commission is 10%, but highlight their specific store rate from their profile if present.
2. LISTING OPTIMIZATION: Guide them on how to write catchy product names, detailed descriptions, and suggest pricing adjustments to compete.
3. TONAL STANDARD: Maintain a highly professional, polite, encouraging, and business-focused attitude. Use business and growth emojis (e.g. 📈, 🛍️, 💡, 🤝).
4. SENSITIVE TRANSACTIONS: For payouts, withdrawals, or password resets, strictly instruct them to use their official Seller Dashboard portal settings. Do not execute or simulate actions.

---
SELLER PROFILE:
${JSON.stringify(sellerProfile, null, 2)}

---
CURRENT STORE PRODUCTS LIST (MAX 10):
${JSON.stringify(sellerProducts, null, 2)}
`;
        } else if (userRole === 'admin' || userRole === 'super_admin') {
            // Retrieve admin systems stats context
            let systemStats = {};
            try {
                const totalCustomers = await pool.query("SELECT COUNT(*) FROM customers WHERE is_active = true");
                const totalSellers = await pool.query("SELECT COUNT(*) FROM sellers");
                const totalProducts = await pool.query("SELECT COUNT(*) FROM products WHERE deleted_at IS NULL");
                const totalOrders = await pool.query("SELECT COUNT(*) FROM orders");
                const pendingSellers = await pool.query("SELECT COUNT(*) FROM sellers WHERE is_verified = false");
                
                systemStats = {
                    activeCustomersCount: parseInt(totalCustomers.rows[0].count),
                    registeredSellersCount: parseInt(totalSellers.rows[0].count),
                    activeProductsCatalog: parseInt(totalProducts.rows[0].count),
                    totalPlatformOrders: parseInt(totalOrders.rows[0].count),
                    sellersAwaitingVerification: parseInt(pendingSellers.rows[0].count)
                };
            } catch (err) {
                console.warn("[CHATBOT WARNING] Failed to fetch admin system stats:", err.message);
            }

            systemInstruction = `
You are "GMD Store-Operations Command Center AI", a highly secure, analytical, and direct administrative operations co-pilot for the GMD Marketplace.
Your goal is to assist platform administrators and super-admins with high-level system checks, marketplace statistics analysis, and operations lookup.

---
STRICT BOUNDARIES:
1. SECURITY-FIRST CONTEXT: Keep your tone direct, analytical, secure, and professional. 
2. DATA ACCURACY: Report the exact, real-time live platform statistics supplied below. Do not fabricate database stats.
3. PRIVILEGE ADVISORY: If they ask how to perform actions (like verifying a seller, banning a user, or updating commissions), explain the exact steps to do so inside the Admin/Super-Admin control panels securely.
4. TONAL STANDARD: Use professional administrative emojis (e.g. 📊, 🛡️, ⚙️, 💻). Avoid chatty or overly conversational phrasing.

---
LIVE PLATFORM STATISTICS:
${JSON.stringify(systemStats, null, 2)}
`;
        } else {
            const userContextString = customerProfile 
                ? `Logged-in Customer Name: ${customerProfile.full_name}\nEmail: ${customerProfile.email}\nPhone: ${customerProfile.phone}\nRecent Orders:\n${JSON.stringify(recentOrders, null, 2)}`
                : "Guest User (Not logged in. If they ask about their orders or track status, kindly advise them to log in to see personalized order updates, or they can provide an Order ID and you will search it).";

            systemInstruction = `
You are "GMD Home Assistant", a warm, polite, and expert home-design and furniture shopping assistant for GMD Home-Products.
Your purpose is to answer user queries with politeness and help them find the perfect furniture, decor, and accessories for their living room, bedroom, kitchen, or any category.

---
STRICT BOUNDARIES:
1. RECOMMENDING PRODUCTS: Only recommend products that are explicitly present in the PRODUCTS CATALOG below. NEVER invent products, brands, prices, or categories.
2. PERSONALIZATION: If the customer is logged in (info in CUSTOMER PROFILE below), greet them by name. If they ask about their order status, use the "Recent Orders" list provided below to give them a real-time, helpful update.
3. INSTRUCTIONS FOR GUESTS: If the customer is a Guest, invite them to sign in to access personalized features like viewing their checkout cart, track orders, or edit wishlists.
4. BRAND TONE: Be delightful, concise, helpful, and use appropriate emojis (e.g. 🏠, ✨, 📦, 🛋️). Do not write super-long text. Keep paragraphs brief. Use bolding and bullets for product lists.
5. FAQ ASSISTANCE: Answer questions about shipping, standard delivery, and return policy (returns are allowed within 15 days on delivered items via the customer's portal).

---
PRODUCTS CATALOG AVAILABLE:
${JSON.stringify(productsList, null, 2)}

---
STORE CATEGORIES AVAILABLE:
${JSON.stringify(categoriesList, null, 2)}

---
CUSTOMER PROFILE & ORDERS:
${userContextString}
`;
        }

        // 4. Run AI Query (or fallback if API Key/SDK is not configured)
        const client = await getGeminiClient();
        if (!client) {
            return res.json({
                success: true,
                reply: "Hello! GMD Home Assistant is currently online. To unlock full AI-powered recommendations, please make sure your administrator has configured the GEMINI_API_KEY environment variable. Let me know what you are looking for!",
                suggestedReplies: ["What is your return policy?", "Browse Categories"]
            });
        }

        let formattedHistory = [];
        // Secure Server-Side History Rebuild: completely ignore client-supplied message content to prevent prompt injection.
        if (!history || history.length <= 1) {
            // Client indicates chat cleared or new conversation. Purge old DB records.
            await pool.query(
                "DELETE FROM chatbot_history WHERE session_id = $1",
                [sessionId]
            );
        } else {
            // Reconstruct history securely from PostgreSQL
            const dbHistory = await pool.query(
                "SELECT role, content FROM chatbot_history WHERE session_id = $1 ORDER BY created_at DESC LIMIT 10",
                [sessionId]
            );
            formattedHistory = dbHistory.rows.reverse().map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content || "" }]
            }));
        }

        // Gemini's startChat API strictly requires the first message to be from the 'user'.
        while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        // Multi-Model Fallback Loop to ensure robust API matching for 2026 standard models
        const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        let lastError = null;
        let replyText = "";

        for (const modelName of candidateModels) {
            try {
                console.log(`[CHATBOT] Attempting communication using model: ${modelName}`);
                const model = client.getGenerativeModel({ 
                    model: modelName,
                    systemInstruction: systemInstruction
                });
                
                // Start chat with history
                const chat = model.startChat({
                    history: formattedHistory,
                    generationConfig: {
                        maxOutputTokens: 800,
                        temperature: 0.7,
                    }
                });

                const result = await chat.sendMessage(message.trim());
                
                replyText = result.response.text();
                console.log(`[CHATBOT SUCCESS] Message processed successfully using model: ${modelName}`);

                // Save both user prompt and AI response to the secure database history
                await pool.query(
                    "INSERT INTO chatbot_history (id, session_id, role, content) VALUES (gen_random_uuid(), $1, 'user', $2)",
                    [sessionId, message.trim()]
                );
                await pool.query(
                    "INSERT INTO chatbot_history (id, session_id, role, content) VALUES (gen_random_uuid(), $1, 'model', $2)",
                    [sessionId, replyText]
                );

                lastError = null;
                break; // Break loop on successful generation!
            } catch (err) {
                lastError = err;
                console.warn(`[CHATBOT WARNING] Model '${modelName}' failed with error: ${err.message}. Trying fallback model...`);
            }
        }

        if (lastError) {
            throw lastError; // If all candidates failed, throw the error
        }

        // 5. Generate Dynamic Quick Suggested Replies based on user type and response context
        const suggestedReplies = [];
        const lowerReply = replyText.toLowerCase();

        if (userRole === 'seller') {
            suggestedReplies.push("How to optimize my listings?");
            suggestedReplies.push("What is my commission rate?");
            suggestedReplies.push("Seller payout guide");
        } else if (userRole === 'admin' || userRole === 'super_admin') {
            suggestedReplies.push("Show platform health status");
            suggestedReplies.push("Sellers awaiting verification");
            suggestedReplies.push("Marketplace statistics summary");
        } else {
            if (lowerReply.includes("order") || lowerReply.includes("track")) {
                suggestedReplies.push("Track my active order");
            }
            if (lowerReply.includes("furniture") || lowerReply.includes("suggest") || lowerReply.includes("recommend") || lowerReply.includes("sofa") || lowerReply.includes("table")) {
                suggestedReplies.push("Suggest living room decor");
                suggestedReplies.push("Kitchen products list");
            }
            if (lowerReply.includes("return") || lowerReply.includes("refund")) {
                suggestedReplies.push("What is your return policy?");
            }
            if (suggestedReplies.length === 0) {
                suggestedReplies.push("Browse Categories");
                suggestedReplies.push("View my profile");
            }
        }

        return res.json({
            success: true,
            reply: replyText,
            suggestedReplies: [...new Set(suggestedReplies)].slice(0, 3)
        });

    } catch (error) {
        console.error("[CHATBOT ERROR]:", error);
        return res.status(500).json({
            success: false,
            message: "I am having trouble processing that right now. Please try again in a moment."
        });
    }
};
