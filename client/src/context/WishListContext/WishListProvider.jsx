import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { WishListContext } from "./WishListContext";
import * as wishlistService from "../../services/wishlistService";
import { useAuth } from "../AuthContext";

export const WishListProvider = ({ children }) => {
  const navigate = useNavigate();
  const [wishList, setWishList] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const pendingOps = useRef(new Set());

  const { currentUser } = useAuth();
  const getCustomerId = () => currentUser?.id || null;

  const mapItem = (item) => ({
    wishlist_item_id: item.wishlist_item_id,
    id: item.product_id,
    product_id: item.product_id,
    variant_id: item.variant_id || null,
    name: item.variant_name ? `${item.name} - ${item.variant_value}` : item.name,
    price: Number(item.mrp) || Number(item.price),
    discountPrice: Number(item.price),
    thumbnail: item.thumbnail,
    brand: item.brand,
    slug: item.slug,
    variant_name: item.variant_name || null,
    variant_value: item.variant_value || null,
  });

  const fetchWishlist = useCallback(async () => {
    const customerId = getCustomerId();
    if (!customerId) {
      setWishList([]);
      return;
    }
    setWishlistLoading(true);
    try {
      const res = await wishlistService.getWishlist(customerId);
      if (res.success) {
        setWishList(res.data.map(mapItem));
      }
    } catch (err) {
      console.error("Fetch wishlist error:", err);
    } finally {
      setWishlistLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const addToWishList = async (product) => {
    const customerId = getCustomerId();
    if (!customerId) {
      navigate("/customer-login");
      return;
    }

    const productId = product.product_id || product.id;
    const variantId = product.selectedVariant?.variant_id || product.variantId || null;
    const opKey = `add-${productId}-${variantId}`;

    if (pendingOps.current.has(opKey)) return;
    pendingOps.current.add(opKey);

    try {
      const res = await wishlistService.addToWishlist({
        customer_id: customerId,
        product_id: productId,
        variant_id: variantId,
      });

      if (res.success) {
        await fetchWishlist();
      }
    } catch (err) {
      console.error("Add to wishlist error:", err);
    } finally {
      pendingOps.current.delete(opKey);
    }
  };

  const removeFromWishList = async (product) => {
    const productId = product.product_id || product.id;
    const variantId = product.variant_id ?? product.variantId ?? null;

    const wishlistItem = wishList.find(
      (item) =>
        item.product_id === productId &&
        (item.variant_id ?? null) === (variantId ?? null)
    );
    
    if (!wishlistItem) return;

    const opKey = `remove-${wishlistItem.wishlist_item_id}`;
    if (pendingOps.current.has(opKey)) return;
    pendingOps.current.add(opKey);

    try {
      await wishlistService.removeFromWishlist(wishlistItem.wishlist_item_id);
      await fetchWishlist();
    } catch (err) {
      console.error("Remove from wishlist error:", err);
    } finally {
      pendingOps.current.delete(opKey);
    }
  };

  const clearWishlistItems = async () => {
    const customerId = getCustomerId();
    if (!customerId) return;
    setWishList([]);
    await wishlistService.clearWishlist(customerId);
  };

  return (
    <WishListContext.Provider value={{ wishList, addToWishList, removeFromWishList, clearWishlist: clearWishlistItems, wishlistLoading }}>
      {children}
    </WishListContext.Provider>
  );
};
