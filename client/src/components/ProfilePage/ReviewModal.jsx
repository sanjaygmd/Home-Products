import React, { useState, useEffect } from "react";
import { X, Star, MessageSquare, Send } from "lucide-react";
import { api } from "../../services/api";
import { useToast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";

const ReviewModal = ({ isOpen, onClose, product, orderItemId, onReviewSubmitted, existingReview = null, variantId = null }) => {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating || 5);
      setTitle(existingReview.title || "");
      setBody(existingReview.body || "");
    } else {
      setRating(5);
      setTitle("");
      setBody("");
    }
  }, [existingReview, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!body.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Please write something in your review." });
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (existingReview) {
        // Edit existing review
        res = await api.put(`/user/customer/reviews/${existingReview.review_id}`, {
          rating,
          title,
          body
        });
      } else {
        // Create new review
        const payload = {
          product_id: product.id,
          order_item_id: orderItemId,
          variant_id: variantId || null,
          rating,
          title,
          body
        };
        res = await api.post('/user/customer/reviews', payload);
      }




      if (res.data.success) {
        toast({ title: "Success", description: existingReview ? "Your review has been updated!" : "Your review has been submitted!" });
        if (onReviewSubmitted) onReviewSubmitted();
        onClose();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to save review."
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col scale-in-center animate-in zoom-in-95 duration-300">
        {/* HEADER */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-lg">
              <MessageSquare size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-950">{existingReview ? "Edit Your Review" : "Write a Review"}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white border rounded-full transition shadow-sm">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* PRODUCT INFO */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <img src={product.image} alt="" className="w-16 h-16 object-cover rounded-xl border shadow-sm" />
            <div>
              <p className="font-black text-slate-950 text-sm">{product.name}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reviewing Product</p>
            </div>
          </div>

          {/* RATING */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Rate your experience</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform active:scale-90"
                >
                  <Star 
                    size={32} 
                    className={cn(
                      "transition-all duration-300",
                      (hover || rating) >= star ? "fill-amber-400 text-amber-400 drop-shadow-md" : "text-slate-200"
                    )} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* FORM FIELDS */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Headline (Optional)</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sum up your experience..."
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-slate-100 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Detailed Review</label>
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What did you like or dislike?"
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-slate-100 outline-none transition-all resize-none"
              />
            </div>
          </div>

          {/* SUBMIT */}
          <button 
            type="submit" 
            disabled={submitting}
            className="w-full h-14 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200 disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={16} /> Submit Review
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
