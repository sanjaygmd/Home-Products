import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MessageSquare, User, Calendar, CheckCircle } from "lucide-react";
import { api } from "../../services/api";

import FavoriteBorderSharpIcon from "@mui/icons-material/FavoriteBorderSharp";
import { CartContext } from "../../context/CartContext/CartContext";
import { WishListContext } from "../../context/WishListContext/WishListContext";
import { useProducts } from "../../context/ProductContext/ProductProvider";
import { useAuth } from "../../context/AuthContext";
import ReviewModal from "../ProfilePage/ReviewModal";

import { animation } from "../../utils/UIStyles";
import * as productService from "../../services/productService";

const SingleProduct = () => {
  const navigate = useNavigate();
  const [imageIndex, setImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const { cart, addToCart, removeFromCart, deleteItem } = useContext(CartContext);
  const { wishList, addToWishList, removeFromWishList } =
    useContext(WishListContext);
  const { products, loading: contextLoading, updateProductRating } = useProducts();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const { currentUser } = useAuth();

  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const variantIdFromUrl = searchParams.get('v');

  const mapSingleProduct = (p) => {
    const mrp = Number(p.mrp) || 0;
    const price = Number(p.price) || 0;

    // Sort all images from table
    const dbImages = p.pi_images ? p.pi_images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)) : [];

    // Logic for "Combined images" fix:
    // Separate main images (no variant_id) from variant-specific images
    const mainImages = dbImages.filter(img => !img.variant_id).map(img => img.image_url);
    if (mainImages.length === 0 && Array.isArray(p.images) && p.images.length > 0) {
      mainImages.push(...p.images);
    }
    if (mainImages.length === 0) mainImages.push("https://via.placeholder.com/400");

    return {
      ...p,
      id: p.product_id,
      basePrice: mrp > 0 ? mrp : price,
      baseDiscountPrice: price,
      discountPercent: p.discount_percent > 0 
        ? p.discount_percent 
        : ((mrp > 0 && mrp > price) ? Math.round(((mrp - price) / mrp) * 100) : 0),
      reviewsCount: p.reviews_count || 0,
      rating: p.rating || 0,
      mainImages: mainImages,
      rawImages: dbImages,
      variants: p.variants || [],
      // Group variants and ensure main product attribute is included as a choice
      stock: p.stock_quantity || 0,
      material: p.material || "Premium Quality",
      room: p.room || "Home",
      color: p.color
    };
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    const findProduct = async () => {
      // Find base product (slug in context might have ?v= query, so we split it)
      const found = products.find((item) => (item.slug.split('?')[0]) === slug);

      if (found) {
        setProduct(found);

        // Handle pre-selection from URL
        if (variantIdFromUrl) {
          const v = found.variants.find(varItem => varItem.variant_id === variantIdFromUrl);
          if (v) setSelectedVariant(v);
          else setSelectedVariant(null);
        } else {
          setSelectedVariant(null);
        }

        setLoading(false);
      } else if (!contextLoading) {
        try {
          const res = await productService.getProductBySlug(slug);
          if (res.success) {
            const mapped = mapSingleProduct(res.data);
            setProduct(mapped);

            if (variantIdFromUrl) {
              const v = mapped.variants.find(varItem => varItem.variant_id === variantIdFromUrl);
              if (v) setSelectedVariant(v);
              else setSelectedVariant(null);
            } else {
              setSelectedVariant(null);
            }
          }
        } catch (err) {
          console.error("Direct fetch failed:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    findProduct();
  }, [slug, products, contextLoading, variantIdFromUrl]);

  useEffect(() => {
    if (product?.id) {
      fetchReviews(product.id, selectedVariant?.variant_id);
    }
  }, [product?.id, selectedVariant?.variant_id]);

  const fetchReviews = async (productId, vId = null) => {
    setLoadingReviews(true);
    try {
      const res = await api.get(`/user/reviews/product/${productId}${vId ? `?variantId=${vId}` : ""}`);
      if (res.data.success) {
        const fetchedReviews = res.data.data;
        setReviews(fetchedReviews);
        
        // Dynamically update product rating and count based on fetched reviews
        if (fetchedReviews.length > 0) {
          const totalRating = fetchedReviews.reduce((acc, rev) => acc + rev.rating, 0);
          const avgRating = (totalRating / fetchedReviews.length).toFixed(1);
          setProduct(prev => prev ? ({
            ...prev,
            rating: avgRating,
            reviewsCount: fetchedReviews.length
          }) : prev);

          // Update global context so other components (Featured, Categories, etc) see the change
          updateProductRating(productId, avgRating, fetchedReviews.length, vId);
        }
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const checkEligibility = async (productId) => {
    if (!currentUser) return;
    try {
      const res = await api.get(`/user/customer/can-review/${productId}`);
      if (res.data.success) {
        setCanReview(res.data.canReview);
        setReviewOrderId(res.data.orderItemId);
        if (res.data.alreadyReviewed) {
          setExistingReview(res.data.review);
        } else {
          setExistingReview(null);
        }
      }
    } catch (err) {
      console.error("Failed to check review eligibility:", err);
    }
  };

  useEffect(() => {
    if (product?.id && currentUser) {
      checkEligibility(product.id);
    }
  }, [product?.id, currentUser]);

  // Determine which selection should determine price/stock
  const activeVariant = selectedVariant;

  const currentPrice = (activeVariant?.price && Number(activeVariant.price) > 0)
    ? Number(activeVariant.price)
    : (product?.baseDiscountPrice || product?.discountPrice || 0);

  const currentStock = activeVariant
    ? Number(activeVariant.stock_quantity)
    : (product?.stock || 0);

  const currentMRP = product?.basePrice || product?.price || 0;

  const currentDiscountPercent = product?.discount_percent > 0 
    ? product.discount_percent 
    : (currentMRP > currentPrice ? Math.round(((currentMRP - currentPrice) / currentMRP) * 100) : 0);

  // Combine images: images from selected variant first, then main images
  const selectionIds = selectedVariant ? [selectedVariant.variant_id] : [];
  const variantImages = (selectionIds.length > 0 && product?.rawImages)
    ? product.rawImages.filter(img => selectionIds.includes(img.variant_id)).map(i => i.image_url)
    : [];

  const finalImages = variantImages.length > 0
    ? variantImages
    : (product?.mainImages || ["https://via.placeholder.com/400"]);

  useEffect(() => {
    if (variantImages.length > 0) {
      setImageIndex(0); // Show the variant image first
    }
  }, [selectedVariant]);

  if (loading) {
    return (
      <div className="w-full min-h-[60vh] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col justify-center items-center gap-4 text-gray-500">
        {/* <span className="text-4xl">🔍</span> */}
        <p className="text-xl font-medium">Product not found</p>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">Return to Home</button>
      </div>
    );
  }

  const isInCart = cart.some((item) => 
    item.product_id === product.product_id &&
    (item.variant_id ?? null) === (selectedVariant?.variant_id ?? null)
  );

  const isInWishList = wishList.some((item) => (item.product_id || item.id) === product.product_id);

  const handleCart = () => {
    const productToCart = {
      ...product,
      discountPrice: currentPrice,
      selectedVariant: selectedVariant,
      variantId: selectedVariant?.variant_id
    };

    if (isInCart) {
      deleteItem(productToCart);
    } else {
      addToCart(productToCart);
    }
  };

  const handleWishList = () => {
    if (isInWishList) {
      removeFromWishList(product);
    } else {
      addToWishList(product);
    }
  };

  return (
    <div className="w-full px-6 md:px-12 py-3 md:py-10 my-2">
      {/* Full Screen Hover Preview Overlay - Minimalist floating version with Framer Motion */}
      <AnimatePresence>
        {isHovered && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] backdrop-blur-md flex items-center justify-center p-6 md:p-12 pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-2xl w-full h-fit flex items-center justify-center"
            >
              <img
                src={finalImages[imageIndex]}
                className="max-w-full max-h-[75vh] object-contain drop-shadow-2xl"
                alt={product.name}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
        <div className="w-full lg:max-w-lg mx-auto flex flex-col h-full">
          {/* Main Image Container - Fixed height to prevent layout shift */}
          <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative h-[400px] md:h-[550px] w-full bg-white rounded-2xl border border-gray-100 flex items-center justify-center p-6 shadow-sm overflow-hidden cursor-zoom-in"
          >
            <img
              key={`${activeVariant?.variant_id}-${imageIndex}`}
              className="max-w-full max-h-full object-contain animate-fadeIn"
              src={finalImages[imageIndex]}
              alt={product.name}
            />
            {/* Hover instruction badge */}
            <div className="absolute bottom-4 right-4 bg-gray-900/5 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
               <p className="text-[9px] font-black text-gray-800 uppercase tracking-widest">Hover to Enlarge</p>
            </div>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 mt-4 overflow-x-auto no-scrollbar py-2 justify-center">
            {finalImages.map((image, index) => (
              <button
                key={index}
                onMouseEnter={() => setImageIndex(index)}
                className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 transition-all p-1 bg-white
                  ${imageIndex === index ? "border-blue-500 shadow-md scale-105" : "border-gray-100 opacity-60 hover:opacity-100"}
                `}
              >
                <img
                  src={image}
                  className="w-full h-full object-contain rounded-lg"
                  alt={`Thumbnail ${index + 1}`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col h-full lg:max-h-[85vh] lg:overflow-y-auto no-scrollbar pr-4">
          <div className="space-y-6">
            <div>
              <p className="text-blue-600 font-bold text-xs tracking-widest uppercase">{product.brand || "Exclusive Collection"}</p>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mt-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mt-3">
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-bold">⭐ {product.rating}</span>
                <span className="text-gray-400 text-sm">({product.reviewsCount} Verified Reviews)</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border-2 border-gray-50 space-y-3 shadow-sm">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-gray-900">₹{currentPrice?.toLocaleString()}</span>
                {currentDiscountPercent > 0 && (
                  <>
                    <span className="text-xl text-gray-400 line-through">₹{currentMRP?.toLocaleString()}</span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg font-bold text-sm">Save {currentDiscountPercent}%</span>
                  </>
                )}
              </div>

              <div className="pt-2 space-y-2">
                {/* Main Product Stock */}
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <span className="font-medium text-xs uppercase tracking-wider">Total Inventory:</span>
                  <span className="font-bold">{product?.stock || 0} units</span>
                </div>

                {/* Variant Specific Stock */}
                {activeVariant && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg border ${Number(activeVariant.stock_quantity) > 0 ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"}`}>
                    <span className="font-medium text-xs uppercase tracking-wider">In this {activeVariant.variant_name}:</span>
                    <span className="font-bold">{activeVariant.stock_quantity} available</span>
                  </div>
                )}

                {!activeVariant && currentStock > 0 ? (
                  <div className="flex items-center gap-2 text-green-600 font-bold">
                    Available {currentStock < 10 && `(Only ${currentStock} left!)`}
                  </div>
                ) : !activeVariant && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl font-bold text-center border border-red-100">
                    Currently Out of Stock
                  </div>
                )}
              </div>
            </div>

            {/* VARIANT SELECTION - INCLUDING MAIN PRODUCT OPTION */}
            {(product?.variants?.length > 0 || product.color) && (
              <div className="space-y-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Color / Option</h3>
                <div className="flex flex-wrap gap-3">
                  {/* Default/Main Product Button */}
                  {product.color && (
                    <button
                      onClick={() => setSelectedVariant(null)}
                      className={`group relative flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all duration-300
                        ${!selectedVariant
                          ? "bg-white border-blue-500 shadow-md scale-105 z-10"
                          : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm"}
                      `}
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-gray-200 shadow-inner"
                        style={{ backgroundColor: product.color.toLowerCase() }}
                      />
                      <div className="text-left flex flex-col">
                        <span className={`text-sm font-black leading-tight ${!selectedVariant ? "text-blue-600" : "text-gray-900"}`}>
                          {product.color} (Original)
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                          ₹{Number(product.baseDiscountPrice).toLocaleString()}
                        </span>
                      </div>
                      {!selectedVariant && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  )}

                  {/* Other Variants */}
                  {product.variants.map((v) => (
                    <button
                      key={v.variant_id}
                      onClick={() => setSelectedVariant(v)}
                      className={`group relative flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all duration-300
                        ${selectedVariant?.variant_id === v.variant_id
                          ? "bg-white border-blue-500 shadow-md scale-105 z-10"
                          : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm"}
                      `}
                    >
                      {v.variant_name.toLowerCase() === 'color' && (
                        <div
                          className="w-5 h-5 rounded-full border border-gray-200 shadow-inner"
                          style={{ backgroundColor: v.variant_value.toLowerCase() }}
                        />
                      )}
                      <div className="text-left flex flex-col">
                        <span className={`text-sm font-black leading-tight ${selectedVariant?.variant_id === v.variant_id ? "text-blue-600" : "text-gray-900"}`}>
                          {v.variant_value}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                          ₹{Number(v.price || product.baseDiscountPrice).toLocaleString()}
                        </span>
                      </div>

                      {selectedVariant?.variant_id === v.variant_id && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Default Display if no selection */}
            {!selectedVariant && (product.color || product.variants[0]) && (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 rounded-2xl border border-gray-100 w-fit">
                <span className="font-bold text-gray-900 uppercase tracking-tighter text-xs">Default:</span>
                <span className="px-3 py-1 bg-gray-50 text-gray-800 rounded-lg font-medium">
                  {product.color ? `Color: ${product.color}` : `${product.variants[0]?.variant_name}: ${product.variants[0]?.variant_value}`}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() =>
                  navigate("/checkout", {
                    state: {
                      buyNowProduct: { ...product, quantity: 1, discountPrice: currentPrice, selectedVariant, variant_id: selectedVariant?.variant_id || null },
                    },
                  })
                }
                disabled={currentStock === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-green-100 transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
              >
                BUY NOW
              </button>
              <div className="flex flex-1 gap-2">
                <button
                  onClick={handleCart}
                  disabled={currentStock === 0}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 disabled:bg-gray-300"
                >
                  {isInCart ? "GO TO CART" : "ADD TO CART"}
                </button>
                <button
                  onClick={handleWishList}
                  className={`p-5 rounded-2xl border-2 transition-all active:scale-95
                    ${isInWishList ? "bg-pink-50 border-pink-200 text-pink-600" : "bg-white border-gray-100 text-gray-400 hover:border-pink-200 hover:text-pink-600"}
                  `}
                >
                  <FavoriteBorderSharpIcon />
                </button>
              </div>
            </div>

            <div className="pt-10 border-t border-gray-100">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Details & Description</h3>
              <div className="prose prose-sm text-gray-600 leading-loose text-justify">
                {product.description || "Premium handcrafted item with attention to detail and superior build quality."}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Best Suited For</h4>
                <p className="text-gray-900 font-bold">{product.room}</p>
              </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-2xl shadow-blue-200">
              <h4 className="text-lg font-black mb-4">Premium Service</h4>
              <ul className="space-y-3 text-sm font-medium opacity-90">
                <li className="flex items-center gap-3">✅ Free Doorstep Delivery</li>
                <li className="flex items-center gap-3">✅ Quality Guaranteed</li>
                <li className="flex items-center gap-3">✅ Secure Payment Gateway</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* REVIEWS SECTION */}
      <div className="mt-20 pt-20 border-t border-gray-100 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <MessageSquare className="text-blue-600" />
              Customer Feedback
            </h2>
            <p className="text-gray-500 font-medium mt-1">Honest thoughts from our verified community</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            {canReview ? (
              <button 
                onClick={() => setShowReviewModal(true)}
                className="px-8 py-4 bg-slate-950 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
              >
                Write a Review
              </button>
            ) : existingReview ? (
              <button 
                onClick={() => setShowReviewModal(true)}
                className="px-8 py-4 bg-white border-2 border-slate-950 text-slate-950 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all shadow-xl shadow-slate-200"
              >
                Edit Your Review
              </button>
            ) : null}
            <div className="flex items-center gap-4 bg-gray-50 px-6 py-4 rounded-3xl border border-gray-100 h-full">
              <div className="text-right">
                <p className="text-2xl font-black text-gray-900">{product.rating || 0}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Average Rating</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div>
                <p className="text-2xl font-black text-gray-900">{reviews.length}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Reviews</p>
              </div>
            </div>
          </div>
        </div>

        {loadingReviews ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-gray-50 rounded-[2.5rem] p-12 text-center border border-dashed border-gray-200">
            <p className="text-gray-500 font-bold italic">No reviews yet. Be the first to share your experience!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {reviews.map((review) => (
              <div key={review.review_id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-100/50 transition-all">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="md:w-48 space-y-4">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={14} 
                          className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} 
                        />
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-gray-400" />
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-gray-900">{review.customer_name}</p>
                          {review.variant_name && (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200">
                              {review.variant_name}: {review.variant_value}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={10} />
                        <p className="text-[9px] font-black uppercase tracking-widest">Verified Purchase</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar size={12} />
                      <p className="text-[10px] font-bold">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    {review.title && <h4 className="text-lg font-black text-gray-900">{review.title}</h4>}
                    <p className="text-gray-600 leading-relaxed text-sm font-medium italic">"{review.body}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showReviewModal && (
        <ReviewModal 
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          orderItemId={reviewOrderId}
          product={{
            id: product.id,
            name: product.name,
            image: finalImages[0]
          }}
          onReviewSubmitted={() => {
            fetchReviews(product.id, selectedVariant?.variant_id);
            checkEligibility(product.id); // Refresh eligibility/existing review
          }}
          existingReview={existingReview}
          variantId={selectedVariant?.variantId || selectedVariant?.variant_id}
        />
      )}
    </div>
  );
};

export default SingleProduct;
