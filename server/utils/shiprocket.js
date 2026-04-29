import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let authToken = null;
let tokenExpiry = null;

/**
 * Authenticate with Shiprocket and get JWT token
 */
export const getAuthToken = async () => {
  // Return cached token if valid (Shiprocket tokens usually last 10 days, we'll check for 9)
  if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
    return authToken;
  }

  const email = process.env.SHIPROCKET_EMAIL?.trim();
  const password = process.env.SHIPROCKET_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error('Shiprocket credentials missing in .env');
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Shiprocket Auth Failed [${response.status}]:`, data.message || 'Unknown error');
      throw new Error(data.message || 'Shiprocket login failed');
    }

    authToken = data.token;
    // Set expiry to 9 days from now
    tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
    

    return authToken;
  } catch (error) {
    console.error('Shiprocket Auth Exception:', error.message);
    throw error;
  }
};

/**
 * Register a pickup location with Shiprocket
 */
export const addShiprocketPickupLocation = async (details) => {
  const token = await getAuthToken();

  try {
    // [VALIDATION FIX] Shiprocket requires address_line_1 to be 10+ chars and contain descriptors like 'House/Road'
    let sanitizedAddress = (details.address_line_1 || '').trim();
    if (sanitizedAddress.length < 10 || !/(house|flat|road|street|building|plot|no)/i.test(sanitizedAddress)) {
      sanitizedAddress = `House No. 1, Main Road, ${sanitizedAddress}`;
    }

    const payload = {
        pickup_location: details.location_name,
        name: details.location_name, // Added for dual-compatibility
        contact_person: details.contact_name || "Warehouse Manager",
        email: details.email || process.env.SHIPROCKET_EMAIL,
        phone: details.contact_phone,
        address: sanitizedAddress,
        city: details.city,
        state: details.state,
        country: "India",
        pin_code: details.pincode
    };



    const response = await fetch(`${BASE_URL}/settings/company/addpickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Shiprocket Add Pickup Error:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Create a new order in Shiprocket
 */
export const createShiprocketOrder = async (orderData) => {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${BASE_URL}/orders/create/adhoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Shiprocket Create Order Error:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Get tracking details using AWB
 */
export const getShiprocketTracking = async (awbCode) => {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${BASE_URL}/courier/track/awb/${awbCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Shiprocket Tracking Error:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Get serviceability and courier options for a shipment
 */
export const getShiprocketServiceability = async (params) => {
  const token = await getAuthToken();
  const query = new URLSearchParams(params).toString();

  try {
    const response = await fetch(`${BASE_URL}/courier/serviceability?${query}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    return await response.json();
  } catch (error) {
    console.error('Shiprocket Serviceability Error:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Assign AWB to a shipment
 */
export const assignShiprocketAWB = async (payload) => {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${BASE_URL}/courier/assign/awb`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    return await response.json();
  } catch (error) {
    console.error('Shiprocket AWB Assign Error:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Generate pickup for a shipment
 */
export const generateShiprocketPickup = async (shipmentIds) => {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${BASE_URL}/courier/generate/pickup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ shipment_id: shipmentIds }),
    });

    return await response.json();
  } catch (error) {
    console.error('Shiprocket Pickup Generation Error:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Cancel an order in Shiprocket
 */
export const cancelShiprocketOrder = async (srOrderIds) => {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${BASE_URL}/orders/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ids: srOrderIds }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Shiprocket Cancel Order Error:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Create a Return Order (Reverse Pickup)
 */
export const createShiprocketReturn = async (returnData) => {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${BASE_URL}/orders/create/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(returnData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Shiprocket Return Order Error:', error.message);
    return { success: false, message: error.message };
  }
};
/**
 * Fetch all registered pickup locations from Shiprocket
 */
export const getShiprocketPickupLocations = async () => {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${BASE_URL}/settings/company/pickup`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Shiprocket Get Pickups Error:', error.message);
    return { success: false, message: error.message };
  }
};
