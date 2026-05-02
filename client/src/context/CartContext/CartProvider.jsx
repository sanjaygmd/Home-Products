import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { CartContext } from "./CartContext";
import * as cartService from "../../services/cartService";
import { useAuth } from "../AuthContext";

export const CartProvider = ({ children }) => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  // Track in-progress operations to prevent race conditions
  const pendingOps = useRef(new Set());

  const { currentUser } = useAuth();
  const getCustomerId = () => currentUser?.id || null;

  const mapItem = (item) => ({
    cart_item_id: item.cart_item_id,
    id: item.product_id,
    product_id: item.product_id,
    variant_id: item.variant_id || null,
    name: item.variant_name ? `${item.name} - ${item.variant_value}` : item.name,
    price: Number(item.mrp) || Number(item.price),
    discountPrice: Number(item.price),
    thumbnail: item.thumbnail,
    brand: item.brand,
    slug: item.slug,
    quantity: item.quantity,
    seller_id: item.seller_id,
    variant_name: item.variant_name || null,
    variant_value: item.variant_value || null,
  });

  // Single source of truth: always fetch from DB
  const fetchCart = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) {
      setCart([]);
      return;
    }
    setCartLoading(true);
    try {
      const res = await cartService.getCart(customerId);
      if (res.success) {
        setCart(res.data.map(mapItem));
      }
    } catch (err) {
      console.error("Fetch cart error:", err);
    } finally {
      setCartLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (product) => {
    const customerId = getCustomerId();
    if (!customerId) {
      navigate("/customer-login");
      return;
    }

    const productId = product.product_id || product.id;
    const variantId = product.selectedVariant?.variant_id || product.variantId || null;
    const opKey = `add-${productId}-${variantId}`;

    // Prevent duplicate concurrent add operations for the same product
    if (pendingOps.current.has(opKey)) return;
    pendingOps.current.add(opKey);

    const price = Number(product.discountPrice || product.price || 0);

    try {
      const res = await cartService.addToCart({
        customer_id: customerId,
        product_id: productId,
        variant_id: variantId,
        quantity: 1,
        price,
      });

      if (!res.success) {
        console.error("Add to cart error:", res.error);
        return;
      }

      // Fetch real state from DB (no temp IDs, no race conditions)
      await fetchCart();

      // Email notification (fire and forget)
      emailjs
        .send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_CART_TEMPLATE_ID,
          { product_name: product.name, to_email: currentUser?.email },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        )
        .catch(() => {});
    } finally {
      pendingOps.current.delete(opKey);
    }
  };

  const removeFromCart = async (product) => {
    const productId = product.product_id || product.id;
    const variantId = product.variant_id ?? product.variantId ?? null;

    // Find by real cart_item_id — only works after fetchCart has run
    const cartItem = cart.find(
      (item) =>
        item.product_id === productId &&
        (item.variant_id ?? null) === (variantId ?? null)
    );
    if (!cartItem) return;

    // Guard: skip if we already have a pending op for this item
    const opKey = `remove-${cartItem.cart_item_id}`;
    if (pendingOps.current.has(opKey)) return;
    pendingOps.current.add(opKey);

    try {
      const newQty = cartItem.quantity - 1;

      if (newQty <= 0) {
        await cartService.removeFromCart(cartItem.cart_item_id);
      } else {
        await cartService.updateCartItem(cartItem.cart_item_id, newQty);
      }

      // Sync UI with DB
      await fetchCart();
    } finally {
      pendingOps.current.delete(opKey);
    }
  };

  const deleteItem = async (product) => {
    const productId = product.product_id || product.id;
    const variantId = product.variant_id ?? product.variantId ?? null;

    const cartItem = cart.find(
      (item) =>
        item.product_id === productId &&
        (item.variant_id ?? null) === (variantId ?? null)
    );
    if (!cartItem) return;

    const opKey = `delete-${cartItem.cart_item_id}`;
    if (pendingOps.current.has(opKey)) return;
    pendingOps.current.add(opKey);

    try {
      await cartService.removeFromCart(cartItem.cart_item_id);
      await fetchCart();
    } finally {
      pendingOps.current.delete(opKey);
    }
  };

  const clearCartItems = async () => {
    const customerId = getCustomerId();
    if (!customerId) return;
    setCart([]);
    await cartService.clearCart(customerId);
  };

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, deleteItem, clearCart: clearCartItems, cartLoading, fetchCart }}
    >
      {children}
    </CartContext.Provider>
  );
};
