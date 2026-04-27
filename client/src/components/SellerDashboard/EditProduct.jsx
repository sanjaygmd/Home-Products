import React, { useState, useContext, useEffect } from "react";
import { ProductContext } from "../../context/ProductContext/ProductContext";
import * as productService from "../../services/productService";

const EditProduct = ({ product, onClose }) => {
  const { updateProduct, updateVariant, fetchSellerProducts } = useContext(ProductContext);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.discountPrice || product?.price || "",
    mrp: product?.mrp || product?.basePrice || "",
    stock_quantity: product?.stock || "",
    brand: product?.brand || "",
    category_id: product?.category_id || "",
    room: product?.room || "",
    weight: product?.weight || "",
    length: product?.length || "",
    breadth: product?.breadth || "",
    height: product?.height || "",
    sku: product?.sku || "",
    variant_name: product?.variant_name || "",
    variant_value: product?.variant_value || "",
  });

  useEffect(() => {
    const fetchCats = async () => {
      const res = await productService.getCategories();
      if (res.success) setCategories(res.data);
    };
    fetchCats();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      setLoading(true);
      
      const sanitizedForm = { ...form };
      ['price', 'mrp', 'stock_quantity', 'weight', 'length', 'breadth', 'height'].forEach(key => {
        if (sanitizedForm[key] === "" || sanitizedForm[key] === undefined) {
          sanitizedForm[key] = null;
        }
      });

      let res;
      if (product.isVariant) {
        res = await updateVariant(product.variantId, sanitizedForm);
      } else {
        res = await updateProduct(product.product_id || product.id, sanitizedForm);
      }

      if (res.success) {
        if (product.seller_id) {
          await fetchSellerProducts(product.seller_id);
        }
        onClose();
      } else {
        alert(res.error || "Update failed");
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-800 placeholder:text-gray-400";
  const lockedInputClass = "w-full px-4 py-3 rounded-xl bg-gray-100 border border-gray-100 text-gray-400 cursor-not-allowed text-sm font-medium";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-[95%] max-w-2xl rounded-3xl shadow-2xl p-8 animate-modal overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Edit Product</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Update essential details for your product</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <span className="text-2xl">✕</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Identity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">General Information</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Product Name</label>
                <input 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  className={inputClass} 
                  required 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase text-blue-500">SKU / Model Number</label>
                <input 
                  name="sku" 
                  value={form.sku} 
                  onChange={handleChange} 
                  className={inputClass} 
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Product Description</label>
                <textarea 
                  name="description" 
                  value={form.description} 
                  onChange={handleChange} 
                  rows="3" 
                  className={inputClass} 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Commercials */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="h-4 w-1 bg-green-500 rounded-full"></div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Commercials & Inventory</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase text-green-600">Selling Price</label>
                <input name="price" type="number" value={form.price} onChange={handleChange} className={inputClass} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">MRP</label>
                <input name="mrp" type="number" value={form.mrp} onChange={handleChange} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase text-green-600">Stock Qty</label>
                <input name="stock_quantity" type="number" value={form.stock_quantity} onChange={handleChange} className={inputClass} required />
              </div>
            </div>
          </div>

          {/* Section 3: Locked Logistics & Variation (Read Only) */}
          <div className="bg-gray-50 p-6 rounded-3xl space-y-5 border border-gray-100">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 bg-gray-300 rounded-full"></div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fixed Attributes (Locked)</h3>
              </div>
              <span className="text-[9px] font-bold text-gray-400 uppercase bg-white px-2 py-1 rounded-full border border-gray-100 flex items-center gap-1">
                <span className="h-1 w-1 bg-gray-400 rounded-full"></span> Read Only
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
              {product.isVariant && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-300 ml-1 uppercase">Variant Type</label>
                    <input 
                      name="variant_name" 
                      value={form.variant_name} 
                      onChange={handleChange} 
                      className={inputClass} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-300 ml-1 uppercase">Variant Value</label>
                    <input 
                      name="variant_value" 
                      value={form.variant_value} 
                      onChange={handleChange} 
                      className={inputClass} 
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-300 ml-1 uppercase">Brand</label>
                <input value={form.brand || "Generic"} disabled className={lockedInputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-300 ml-1 uppercase">Category</label>
                <input value={categories.find(c => c.category_id === form.category_id)?.name || "Furniture"} disabled className={lockedInputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-300 ml-1 uppercase">Weight</label>
                <input value={`${form.weight || 0} kg`} disabled className={lockedInputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-300 ml-1 uppercase">Dimensions</label>
                <input value={`${form.length || 0}x${form.breadth || 0}x${form.height || 0}`} disabled className={lockedInputClass} />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-50 flex gap-4">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-4 rounded-2xl border border-gray-200 text-sm font-bold text-gray-400 hover:bg-gray-50 transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-2 w-full bg-slate-950 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:translate-y-0 text-sm uppercase tracking-widest">
              {loading ? "Syncing..." : "Update Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProduct;