import Razorpay from 'razorpay';
import crypto from 'crypto';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

const isProduction = process.env.NODE_ENV === 'production';

// Detect placeholder keys
const isPlaceholder = !key_secret || key_secret.includes('your_razorpay') || key_secret === 'razorpay_secret_2026';

let _razorpay = null;
const getRazorpay = () => {
  if (isPlaceholder) return null;
  if (!_razorpay) {
    _razorpay = new Razorpay({ key_id, key_secret });
  }
  return _razorpay;
};

/**
 * Verify Razorpay Payment Signature
 */
export const verifySignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  if (razorpayOrderId.startsWith('order_mock_')) {
    if (isProduction) {
      throw new Error("Mock payments are not allowed in production.");
    }
    // Dynamic mock signature: sha256 of orderId + key_secret (or fallback)
    const expectedMockSig = crypto.createHmac('sha256', key_secret || 'dev_secret').update(razorpayOrderId).digest('hex');
    return razorpaySignature === expectedMockSig || razorpaySignature === 'mock_signature_bypass_legacy';
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new Error("Razorpay is not configured.");
  }

  const generated_signature = crypto
    .createHmac('sha256', key_secret)
    .update(razorpayOrderId + "|" + razorpayPaymentId)
    .digest('hex');

  return generated_signature === razorpaySignature;
};

/**
 * Initiate a refund for a payment
 */
export const initiateRefund = async (paymentId, amount, notes = "Automated Refund") => {
  try {
    if (!paymentId) return { success: false, message: "No transaction ID provided for refund." };

    const razorpay = getRazorpay();
    if (paymentId.startsWith('order_mock_') || paymentId === 'mock_id' || !razorpay) {
      if (isProduction && paymentId.startsWith('order_mock_')) {
        throw new Error("Cannot refund a mock payment in production.");
      }
      console.log(`[RAZORPAY MOCK REFUND] Simulating refund for ${paymentId} amount: ${amount}`);
      return { success: true, refund_id: `rfnd_mock_${crypto.randomBytes(8).toString('hex')}` };
    }

    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100), // convert to paise
      notes: { reason: notes }
    });

    return { success: true, refund_id: refund.id };
  } catch (error) {
    console.error('[RAZORPAY REFUND ERROR]', error);
    return { success: false, message: error.message || "Refund failed" };
  }
};

/**
 * Auto-refunds a payment if the order creation process fails after payment is already captured.
 * This ensures "Transaction Safety" - money is never trapped in a failed order state.
 */
export const autoRefundOrphanedPayment = async (paymentId, razorpayOrderId, amount) => {
    if (!paymentId || !razorpayOrderId) return;
    
    const isMock = process.env.NODE_ENV !== 'production' && razorpayOrderId.startsWith('order_mock_');
    if (isMock) {
        console.log(`[TRANSACTION SAFETY] Skipping auto-refund for mock order ${razorpayOrderId}`);
        return;
    }

    try {
        console.log(`[TRANSACTION SAFETY] Initiating auto-refund for orphaned payment: ${paymentId}`);
        const result = await initiateRefund(paymentId, amount, "Transaction Safety: Order creation failed after payment.");
        if (result.success) {
            console.log(`[TRANSACTION SAFETY] Successfully auto-refunded ${paymentId}. Refund ID: ${result.refund_id}`);
        } else {
            console.error(`[TRANSACTION SAFETY ALERT] Auto-refund failed for ${paymentId}:`, result.message);
        }
    } catch (err) {
        console.error(`[TRANSACTION SAFETY CRITICAL] Exception during auto-refund for ${paymentId}:`, err.message);
    }
};

export const createRazorpayOrderInstance = async (amount, currency = 'INR') => {
  if (isPlaceholder) {
    if (isProduction) {
      throw new Error("Payment gateway not configured for production.");
    }
    const mockId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
    const mockSig = crypto.createHmac('sha256', key_secret || 'dev_secret').update(mockId).digest('hex');
    return {
      success: true,
      isMock: true,
      order: {
        id: mockId
      },
      mock_signature: mockSig
    };
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    throw new Error("Razorpay is not initialized.");
  }

  const options = {
    amount: Math.round(Number(amount) * 100),
    currency,
    receipt: `order_receipt_${Date.now()}`
  };

  try {
    const order = await razorpay.orders.create(options);
    return { success: true, order };
  } catch (apiErr) {
    if (apiErr.statusCode === 401 && !isProduction) {
      console.warn('[RAZORPAY AUTH FAILED] Falling back to mock in dev.');
      return {
        success: true,
        isMock: true,
        order: {
          id: `order_mock_${crypto.randomBytes(8).toString('hex')}`
        }
      };
    }
    throw apiErr;
  }
};
