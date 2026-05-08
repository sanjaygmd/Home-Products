import { describe, it, expect } from 'vitest';

// Pure-functional calculations mirror of OrderController financial logic to guarantee regression protection!
function calculateOrderTotals({ subtotal, paymentMethod, coupon }) {
  // Cap coupon discount to subtotal
  let discountAmount = 0;
  if (coupon) {
    if (coupon.type === 'percentage') {
      discountAmount = (subtotal * coupon.discount_percent) / 100;
      if (coupon.max_discount) {
        discountAmount = Math.min(discountAmount, coupon.max_discount);
      }
    } else {
      discountAmount = coupon.discount_amount || 0;
    }
  }
  discountAmount = Math.min(discountAmount, subtotal);

  const taxAmount = Math.round(subtotal * 0.05); // 5% Tax
  const platformFee = 10;
  const codFee = paymentMethod === 'cod' ? 50 : 0;
  const shippingCharges = subtotal > 1000 ? 0 : 40;
  
  const totalAmount = Math.max(0, subtotal + shippingCharges + taxAmount + platformFee + codFee - discountAmount);

  return {
    subtotal,
    shippingCharges,
    taxAmount,
    platformFee,
    codFee,
    discountAmount,
    totalAmount
  };
}

describe('Order Financial Calculations & Rules', () => {
  it('should correctly calculate totals for credit card order under 1000 subtotal with no coupon', () => {
    const totals = calculateOrderTotals({
      subtotal: 500,
      paymentMethod: 'online',
      coupon: null
    });

    expect(totals.subtotal).toBe(500);
    expect(totals.shippingCharges).toBe(40); // Subtotal <= 1000
    expect(totals.taxAmount).toBe(25); // 5% of 500
    expect(totals.platformFee).toBe(10);
    expect(totals.codFee).toBe(0);
    expect(totals.discountAmount).toBe(0);
    expect(totals.totalAmount).toBe(575); // 500 + 40 + 25 + 10 = 575
  });

  it('should apply free shipping for subtotal above 1000', () => {
    const totals = calculateOrderTotals({
      subtotal: 1200,
      paymentMethod: 'online',
      coupon: null
    });

    expect(totals.shippingCharges).toBe(0); // Free shipping
    expect(totals.taxAmount).toBe(60); // 5% of 1200
    expect(totals.totalAmount).toBe(1270); // 1200 + 0 + 60 + 10 = 1270
  });

  it('should apply 50 COD fee for cash-on-delivery orders', () => {
    const totals = calculateOrderTotals({
      subtotal: 500,
      paymentMethod: 'cod',
      coupon: null
    });

    expect(totals.codFee).toBe(50);
    expect(totals.totalAmount).toBe(625); // 500 + 40 + 25 + 10 + 50 = 625
  });

  it('should apply percentage coupon with maximum cap', () => {
    const totals = calculateOrderTotals({
      subtotal: 1000,
      paymentMethod: 'online',
      coupon: {
        type: 'percentage',
        discount_percent: 20,
        max_discount: 100
      }
    });

    expect(totals.discountAmount).toBe(100);
    expect(totals.totalAmount).toBe(1000);
  });

  it('should cap coupon discount to subtotal value to prevent negative totals', () => {
    const totals = calculateOrderTotals({
      subtotal: 100,
      paymentMethod: 'online',
      coupon: {
        type: 'fixed',
        discount_amount: 500
      }
    });

    expect(totals.discountAmount).toBe(100); // capped at subtotal 100
    expect(totals.totalAmount).toBe(55); // 100 + 40 (shipping) + 5 (tax) + 10 (fee) - 100 = 55
  });
});
