import React, { useState } from "react";
import { card, input, buttonPrimary } from "../../utils/UIStyles";
import { validateCoupon } from "../../services/couponService";

const OrderSummary = ({
  subtotal = 0,
  delivery = 0,
  gst = 0,
  platformFee = 10,
  total = 0,
  paymentMethod = "razorpay",
  onCouponApply, // Callback to pass discount up
}) => {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const codFee = paymentMethod === "cod" ? 50 : 0;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setLoading(true);
    setError("");
    const res = await validateCoupon(couponCode, subtotal);
    if (res.success) {
      setAppliedCoupon(res.data);
      if (onCouponApply) onCouponApply(res.data);
    } else {
      setError(res.message);
      setAppliedCoupon(null);
    }
    setLoading(false);
  };

  const discountAmount = appliedCoupon 
    ? (appliedCoupon.type === 'percentage')
      ? Math.min(
          (subtotal * parseFloat(appliedCoupon.discount_percent || 0)) / 100, 
          parseFloat(appliedCoupon.max_discount || Infinity)
        ) 
      : parseFloat(appliedCoupon.discount_amount || 0)
    : 0;

  const finalTotal = subtotal + delivery + gst + codFee + platformFee - discountAmount;

  return (
    <div className={`${card} p-6 space-y-6 sticky top-10`}>

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-gray-900">
          Order Summary
        </h2>
        <p className="text-sm text-gray-500">
          Review your order before checkout
        </p>
      </div>

      {/* Coupon Section */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apply Coupon</label>
        <div className="flex gap-2">
            <input 
            type="text" 
            value={couponCode} 
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className={`${input} h-11 uppercase font-bold tracking-widest`}
            disabled={appliedCoupon}
          />
          {appliedCoupon ? (
            <button 
                onClick={() => { setAppliedCoupon(null); setCouponCode(""); if (onCouponApply) onCouponApply(null); }}
                className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
                REMOVE
            </button>
          ) : (
            <button 
                onClick={handleApplyCoupon}
                disabled={loading || !couponCode}
                className={`${buttonPrimary} px-6 h-11 text-xs whitespace-nowrap`}
            >
                {loading ? '...' : 'APPLY'}
            </button>
          )}
        </div>
        {error && <p className="text-[10px] font-bold text-red-500">{error}</p>}
        {appliedCoupon && (
            <p className="text-[10px] font-bold text-green-600">
                ✓ SAVED ₹{discountAmount.toFixed(2)} WITH {appliedCoupon.code}
            </p>
        )}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-3">

        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span className="font-medium text-gray-900">
            ₹{subtotal}
          </span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Delivery</span>
          <span className={delivery === 0 ? "text-green-600 font-medium" : "text-gray-900"}>
            {delivery === 0 ? "Free" : `₹${delivery}`}
          </span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>Platform</span>
          <span className={platformFee === 0 ? "text-green-600 font-medium" : "text-gray-900"}>
            {platformFee === 0 ? "Free" : `₹${platformFee}`}
          </span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>GST (5%)</span>
          <span className="text-gray-900">
            ₹{gst}
          </span>
        </div>

        {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-bold">
                <span>Coupon Discount</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
            </div>
        )}

        {paymentMethod === "cod" && (
          <div className="flex justify-between text-sm text-red-500">
            <span>COD Fee</span>
            <span>₹{codFee}</span>
          </div>
        )}

      </div>

      <div className="rounded-xl p-4 flex justify-between items-center bg-gradient-to-r from-blue-50 to-blue-100">

        <div>
          <p className="text-sm text-gray-600">
            Total Payable
          </p>
          <p className="text-xs text-gray-400">
            Inclusive of all taxes
          </p>
        </div>

        <span className="text-2xl font-bold text-blue-700 tracking-tight">
          ₹{parseFloat(total).toFixed(2)}
        </span>

      </div>

      <div className="flex justify-between items-center text-sm border rounded-xl px-4 py-3">

        <span className="text-gray-500">
          Payment Method
        </span>

        <span className={`font-medium ${
          paymentMethod === "cod"
            ? "text-orange-600"
            : "text-gray-800"
        }`}>
          {paymentMethod === "cod"
            ? "Cash on Delivery"
            : "Online Payment"}
        </span>

      </div>

      <div className="flex justify-between text-xs text-gray-400 pt-1">
        <span>🔒 Secure</span>
        <span>🚚 Fast Delivery</span>
        <span>↩ Easy Returns</span>
      </div>

    </div>
  );
};

export default OrderSummary;