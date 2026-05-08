import { pool } from "../../configs/db.js";
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateOtp, hashOtp } from "../../utils/otp.js";
import { sendEmailOtp } from "../../utils/email.js";
import { createAuthSession, invalidateSession, cookieConfig, getCookieName, setSessionCookie } from "../../utils/authSession.js";
import { sanitizeText } from "../../utils/sanitizer.js";

export const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Some fields are missing'
      })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const startTime = Date.now();
    const ensureConstantTime = async () => {
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 450 - elapsed);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    };

    const existingUser = await pool.query(
      "SELECT customer_id, full_name, email, phone, is_active, block_reason, password_hash, profile_picture_url FROM customers WHERE email = $1", 
      [email]
    )
    if (existingUser.rows.length === 0) {
      // Burn CPU cycles matching a normal password hashing check to prevent timing side-channels
      const dummyHash = '$2b$12$DummyHashDummyHashDummyHashDummyHashDummyHashDummy';
      await bcrypt.compare(password, dummyHash);
      await ensureConstantTime();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = existingUser.rows[0];

    if (!user.is_active) {
      await ensureConstantTime();
      return res.status(403).json({
        success: false,
        message: user.block_reason || 'Your account has been restricted. Please contact support.',
        block_reason: user.block_reason
      });
    }

    let isMatch = false;
    const isBcrypt = user.password_hash && (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$'));
    
    if (isBcrypt) {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      const passwordMatch = await pool.query("SELECT crypt($1, $2) = $2 AS match", [password, user.password_hash]);
      isMatch = !!passwordMatch.rows[0]?.match;
    }

    if (!isMatch) {
      await ensureConstantTime();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Lazy migration: upgrade legacy hash to bcrypt!
    if (!isBcrypt) {
      const newHash = await bcrypt.hash(password, 12);
      await pool.query("UPDATE customers SET password_hash = $1 WHERE customer_id = $2", [newHash, user.customer_id]);
      console.log(`[AUTH] Migrated legacy hash for customer ${user.email} to bcrypt successfully.`);
    }

    // Create Auth Session
    const ip = req.ip || req.socket.remoteAddress;
    const device = { agent: req.get('User-Agent') };
    const session = await createAuthSession(user.customer_id, 'customer', ip, device);

    setSessionCookie(res, 'customer', session.token);

    return res.status(200).json({
      success: true,
      message: 'Logging in customer successful',
      data: {
        id: user.customer_id,
        name: user.full_name,
        email: user.email,
        phone: user.phone,
        profile_picture_url: user.profile_picture_url,
        sessionId: session.sessionId
      }
    })



  } catch (error) {
    console.error("CUSTOMER LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: 'Customer login failed'
    })
  }
}


export const registerCustomer = async (req, res) => {
  try {
    const { full_name, email, phone, date_of_birth, gender, profile_picture_url, password } = req.body;

    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    const cleanFullName = sanitizeText(full_name);
    if (cleanFullName.length < 3) {
      return res.status(400).json({ success: false, message: "Full name must be at least 3 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ success: false, message: "Phone number must be 10 digits" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const existingUser = await pool.query(
      "SELECT customer_id FROM customers WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO customers 
      (customer_id, full_name, email, phone, password_hash, date_of_birth, gender, profile_picture_url) 
      VALUES 
      (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      RETURNING customer_id, full_name, email, phone, profile_picture_url`,
      [cleanFullName, email, phone, passwordHash, date_of_birth || null, gender || null, profile_picture_url || null]
    );

    // Create Auth Session automatically on register
    const ip = req.ip || req.socket.remoteAddress;
    const device = { agent: req.get('User-Agent') };
    const session = await createAuthSession(result.rows[0].customer_id, 'customer', ip, device);

    setSessionCookie(res, 'customer', session.token);

    return res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      data: {
        id: result.rows[0].customer_id,
        name: result.rows[0].full_name,
        email: result.rows[0].email,
        phone: result.rows[0].phone,
        profile_picture_url: result.rows[0].profile_picture_url,
        sessionId: session.sessionId
      },
    });


  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Customer registration failed",
    });
  }
};

export const customerOnboarding = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      full_name,
      phone,
      address_line_1,
      address_line_2,
      city,
      state,
      pincode,
      country,
      is_default,
    } = req.body;

    if (!address_line_1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // Ownership Check
    if (req.user.id !== id && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const user = await pool.query(
      "SELECT full_name, phone FROM customers WHERE customer_id = $1",
      [id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const cleanFullName = sanitizeText(full_name);
    const cleanAddressLine1 = sanitizeText(address_line_1);
    const cleanAddressLine2 = sanitizeText(address_line_2);
    const cleanCity = sanitizeText(city);
    const cleanState = sanitizeText(state);
    const cleanCountry = sanitizeText(country);

    const result = await pool.query(
      `INSERT INTO addresses 
      (address_id, customer_id, full_name, phone, address_line_1, address_line_2, city, state, pincode, country, is_default)
      VALUES 
      (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        cleanFullName,
        phone,
        cleanAddressLine1,
        cleanAddressLine2,
        cleanCity,
        cleanState,
        pincode,
        cleanCountry,
        is_default ?? true,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Customer onboarding failed",
    });
  }
};


export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Ownership Check
    if (req.user.id !== id && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const user = await pool.query(
      "SELECT customer_id, full_name, email, phone, date_of_birth, gender, profile_picture_url, is_active, created_at FROM customers WHERE customer_id = $1",
      [id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Getting customer id is successful',
      data: user.rows[0]
    })
  } catch (error) {
    console.error("GET CUSTOMER BY ID ERROR:", error);
    return res.status(500).json({ success: false, message: 'Failed to get customer by id' });
  }
}


export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, date_of_birth, gender, profile_picture_url } = req.body;

    // Ownership Check
    if (req.user.id !== id && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    if (!full_name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Full name and phone are required",
      });
    }

    const cleanFullName = sanitizeText(full_name);

    const result = await pool.query(
      `UPDATE customers 
       SET full_name = $1, phone = $2, date_of_birth = $3, gender = $4, profile_picture_url = $5 
       WHERE customer_id = $6 
       RETURNING customer_id, full_name, email, phone, date_of_birth, gender, profile_picture_url`,
      [cleanFullName, phone, date_of_birth || null, gender || null, profile_picture_url || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
};


export const getCustomerStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Ownership Check
    if (req.user.id !== id && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const ordersCount = await pool.query("SELECT COUNT(*) FROM orders WHERE customer_id = $1", [id]);
    const cartCount = await pool.query("SELECT item_count FROM cart WHERE customer_id = $1", [id]);
    const wishlistCount = await pool.query("SELECT item_count FROM wishlist WHERE customer_id = $1", [id]);

    return res.status(200).json({
      success: true,
      data: {
        orders: parseInt(ordersCount.rows[0].count),
        cart: cartCount.rows[0]?.item_count || 0,
        wishlist: wishlistCount.rows[0]?.item_count || 0,
      }
    });
  } catch (error) {
    console.error("GET CUSTOMER STATS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to get customer stats" });
  }
};


export const getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;

    // Ownership Check
    if (req.user.id !== id && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const result = await pool.query(
      `SELECT * FROM orders WHERE customer_id = $1 ORDER BY placed_at DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("GET CUSTOMER ORDERS ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to get customer orders" });
  }
};


export const getCustomerAddresses = async (req, res) => {
  try {
    const { id } = req.params;

    // Ownership Check
    if (req.user.id !== id && req.user.type !== 'admin') {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const result = await pool.query(
      `SELECT * FROM addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("GET CUSTOMER ADDRESSES ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to get customer addresses" });
  }
};

export const getMe = async (req, res) => {
  try {
    const userTypes = {
      customer: { table: 'customers', id: 'customer_id', fields: 'full_name as name, email, phone, date_of_birth, gender, profile_picture_url, is_active, created_at' },
      seller: { table: 'sellers', id: 'seller_id', fields: 'full_name as name, email, phone, store_name, gstin, store_logo_url, store_description, is_verified, is_active, created_at' },
      admin: { table: 'admins', id: 'admin_id', fields: 'name, email, role, is_active, created_at' },
      super_admin: { table: 'super_admins', id: 'super_admin_id', fields: 'name, email, role, is_active, created_at' }
    };

    const config = userTypes[req.user.type];
    if (!config) return res.status(400).json({ success: false, message: "Invalid user type" });

    const result = await pool.query(`SELECT ${config.id} as id, ${config.fields} FROM ${config.table} WHERE ${config.id} = $1`, [req.user.id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });

    const userData = { ...result.rows[0], role: req.user.type };
    return res.status(200).json({ success: true, data: userData });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user profile" });
  }
};



export const logoutCustomer = async (req, res) => {
  try {
    let sessionId = req.sessionId;
    
    if (!sessionId && req.cookies) {
      const token = req.cookies.customer_token || req.cookies.token;
      if (token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const sessionRes = await pool.query(
          "SELECT session_id FROM auth_sessions WHERE token_hash = $1 AND is_blacklisted = false",
          [tokenHash]
        );
        if (sessionRes.rows.length > 0) {
          sessionId = sessionRes.rows[0].session_id;
        }
      }
    }

    if (sessionId) {
      await invalidateSession(sessionId);
    }
    const clearOptions = { 
      path: '/', 
      httpOnly: true, 
      sameSite: 'lax', 
      secure: process.env.NODE_ENV === 'production' 
    };
    res.clearCookie('token', clearOptions);
    res.clearCookie('admin_token', clearOptions);
    res.clearCookie('seller_token', clearOptions);
    res.clearCookie('customer_token', clearOptions);
    res.clearCookie('super_admin_token', clearOptions);
    return res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: 'Customer logout failed'
    })
  }
}


export const sendOTP = async (req, res) => {
  try {
    const { email, purpose, user_type } = req.body;
    const type = user_type || 'customer';

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Check existence based on purpose
    const table = type === 'seller' ? 'sellers' : 'customers';
    const idColumn = type === 'seller' ? 'seller_id' : 'customer_id';

    const existingUser = await pool.query(`SELECT ${idColumn} FROM ${table} WHERE email = $1`, [email]);

    if (purpose === 'registration' && existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const otp = generateOtp();
    const otp_hash = hashOtp(otp);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      `INSERT INTO otp_verifications (otp_id, contact, otp_hash, expires_at, user_type, purpose)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       ON CONFLICT (contact) DO UPDATE 
       SET otp_hash = $2, expires_at = $3, is_used = false, attempts = 0, purpose = $5, user_type = $4`,
      [email, otp_hash, expires_at, type, purpose || 'registration']
    );

    await sendEmailOtp(email, otp);

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("SEND OTP ERROR:", error.message);
    return res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp, purpose, user_type } = req.body;
    const type = user_type || 'customer';

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    const result = await pool.query(
      `SELECT * FROM otp_verifications 
       WHERE contact = $1 AND user_type = $2 AND purpose = $3`,
      [email, type, purpose || 'registration']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "OTP not found" });
    }

    const otpData = result.rows[0];

    if (otpData.is_used) {
      return res.status(400).json({ success: false, message: "OTP already used" });
    }

    if (new Date() > otpData.expires_at) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (otpData.attempts >= 5) {
      return res.status(400).json({ success: false, message: "Too many failed attempts" });
    }

    const hashedInput = hashOtp(otp);
    if (hashedInput !== otpData.otp_hash) {
      await pool.query(
        "UPDATE otp_verifications SET attempts = attempts + 1 WHERE otp_id = $1",
        [otpData.otp_id]
      );
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // Mark as used
    await pool.query(
      "UPDATE otp_verifications SET is_used = true WHERE otp_id = $1",
      [otpData.otp_id]
    );

    return res.status(200).json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error.message);
    return res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};