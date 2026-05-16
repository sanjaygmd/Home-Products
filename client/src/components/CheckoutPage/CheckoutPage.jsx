import React, { useState, useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext/CartContext";
import { useAuth } from "../../context/AuthContext.jsx";

import PersonalDetails from "./PersonalDetails";
import PaymentMethod from "./PaymentMethod";
import ReviewOrder from "./ReviewOrder";
import OrderSummary from "./OrderSummary";

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart } = useContext(CartContext);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer') {
      navigate("/customer-login");
    }
  }, [currentUser, navigate]);


  const [step, setStep] = useState(1);
  const [userDetails, setUserDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const buyNowProduct = location?.state?.buyNowProduct;
  const checkoutItems = location?.state?.checkoutItems;

  const items = buyNowProduct ? [buyNowProduct] : (checkoutItems || cart);

  const subtotal = items.reduce((acc, item) => {
    if (item.stock === 0) return acc;
    return acc + (item.discountPrice || item.price || 0) * (item.quantity || 1);
  }, 0);


  const delivery = subtotal > 5000 ? 0 : 150;
  const gst = Math.round(subtotal * 0.05);
  const codFee = paymentMethod === "cod" ? 50 : 0;
  const platformFee = 10;

  const discountAmount = appliedCoupon
    ? (appliedCoupon.type === 'percentage')
      ? Math.min(
        (subtotal * parseFloat(appliedCoupon.discount_percent || 0)) / 100,
        parseFloat(appliedCoupon.max_discount || Infinity)
      )
      : parseFloat(appliedCoupon.discount_amount || 0)
    : 0;

  const total = subtotal + delivery + gst + codFee + platformFee - discountAmount;

  return (
    <div className="w-full px-6 md:px-12 py-10 bg-gray-50 min-h-screen">

      <div className="flex justify-center gap-10 mb-12">
        {["Details", "Payment", "Review"].map((label, i) => {
          const current = i + 1;

          return (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold
                ${step >= current ? "bg-blue-600 text-white shadow" : "bg-gray-200 text-gray-500"}`}>
                {current}
              </div>

              <span className={`text-sm font-medium
                ${step >= current ? "text-blue-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2">

          {step === 1 && (
            <PersonalDetails
              onNext={(data) => {
                setUserDetails(data);
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <PaymentMethod
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <ReviewOrder
              onBack={() => setStep(2)}
              paymentMethod={paymentMethod}
              total={total}
              userDetails={userDetails}
              items={items}
              appliedCoupon={appliedCoupon}
            />
          )}

        </div>

        <OrderSummary
          subtotal={subtotal}
          delivery={delivery}
          gst={gst}
          total={total}
          platformFee={platformFee}
          paymentMethod={paymentMethod}
          appliedCoupon={appliedCoupon}
          onCouponApply={setAppliedCoupon}
        />
      </div>
    </div>
  );
};

export default CheckoutPage;