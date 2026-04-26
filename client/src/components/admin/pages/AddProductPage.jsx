import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { 
  ArrowLeft, Upload, X, Plus, Image as ImageIcon, CheckCircle2, 
  AlertCircle, ShoppingBag, Package, Eye, Layers, IndianRupee,
  Settings, Ruler, Save, Trash2
} from "lucide-react";
import { useProducts } from "../../../context/ProductContext/ProductProvider";
import { useToast } from "../../../hooks/use-toast";
import { cn } from "../../../lib/utils";

const inputClass = "w-full h-14 px-5 rounded-[1.25rem] bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all text-sm font-bold text-slate-800";
const labelClass = "text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1";

export default function AddProductPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { products, addProduct, updateProduct } = useProducts();
  const { toast } = useToast();

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    price: "",
    mrp: "",
    stock_quantity: "",
    weight: "",
    length: "",
    breadth: "",
    height: "",
    brand: "",
    category_id: "",
    seller_id: "",
    room: "",
    color: "",
  });

  const [images, setImages] = useState([]); // Array of { url, variantTempId }
  const [variants, setVariants] = useState([]);
  const [currentVariant, setCurrentVariant] = useState({
    name: "Color",
    value: "",
    price: "",
    stock: "",
    sku: ""
  });

  const fetchInitialData = useCallback(async () => {
    try {
      const [catRes, selRes] = await Promise.all([
        fetch('http://localhost:5000/product/categories'),
        fetch('http://localhost:5000/user/admin/sellers-data')
      ]);
      
      if (catRes.ok) {
        const result = await catRes.json();
        if (result.success && Array.isArray(result.data)) {
          setCategories(result.data.filter(c => !c.parent_category_id));
        }
      }

      if (selRes.ok) {
        const result = await selRes.json();
        if (result.success && Array.isArray(result.data)) {
          setSellers(result.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

    useEffect(() => {
    const loadProductData = async () => {
      if (!isEditMode) return;
      setLoading(true);

      try {
        let existing = products.find(p => String(p.id) === String(id) || String(p.product_id) === String(id));
        
        // Always fetch fresh for Admin Edit to ensure variants are latest
        const res = await fetch(`http://localhost:5000/product/${id}`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            existing = result.data;
          }
        }

        if (existing) {
          setForm({
            name: existing.name || "",
            description: existing.description || "",
            sku: existing.sku || "",
            price: existing.price || "",
            mrp: existing.mrp || "",
            stock_quantity: existing.stock_quantity || existing.stock || "",
            weight: existing.weight || "",
            length: existing.length || "",
            breadth: existing.breadth || "",
            height: existing.height || "",
            brand: existing.brand || "",
            category_id: existing.category_id || "",
            seller_id: existing.seller_id || "",
            room: existing.room || "",
            color: existing.color || "",
          });

          // Handle images mapping correctly
          let productImages = [];
          if (existing.pi_images) {
            productImages = existing.pi_images
              .sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0))
              .map(img => ({ url: img.image_url, variantTempId: img.variant_id }));
          } else if (existing.images) {
            productImages = existing.images.map(img => typeof img === 'string' ? { url: img, variantTempId: null } : img);
          }
          setImages(productImages);
          
          // Handle variants
          if (existing.variants) {
            setVariants(existing.variants.map(v => ({
              ...v,
              name: v.variant_name || v.name,
              value: v.variant_value || v.value,
              tempId: v.variant_id || v.id,
              stock: v.stock_quantity || v.stock
            })));
          }
        }
      } catch (err) {
        console.error("Failed to load product data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [id, products, isEditMode]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleVariantChange = (e) => {
    setCurrentVariant({ ...currentVariant, [e.target.name]: e.target.value });
  };

  const addVariant = () => {
    if (!currentVariant.value) return;
    const tempId = 'v_' + Math.random().toString(36).substr(2, 9);
    
    // Auto-generate a unique SKU with entropy to prevent collisions
    const baseSku = form.sku || form.name.substring(0, 5).toUpperCase().replace(/\s+/g, '') || 'PROD';
    const entropy = Math.random().toString(36).substr(2, 6).toUpperCase();
    const variantSku = currentVariant.sku || `${baseSku}-${currentVariant.value.toUpperCase().replace(/\s+/g, '-')}-${entropy}`;
    
    console.log("GENERATED VARIANT SKU:", variantSku);
    setVariants([...variants, { ...currentVariant, sku: variantSku, tempId }]);
    setCurrentVariant({ ...currentVariant, value: "", sku: "" });
  };

  const removeVariant = (index) => {
    const v = variants[index];
    setVariants(variants.filter((_, i) => i !== index));
    setImages(images.map(img => img.variantTempId === v.tempId ? { ...img, variantTempId: null } : img));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImages(prev => [...prev, { url: dataUrl, variantTempId: null }]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const tagImageToVariant = (imageIndex, variantTempId) => {
    const newImages = [...images];
    newImages[imageIndex].variantTempId = variantTempId === "none" ? null : variantTempId;
    setImages(newImages);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;

    if (!form.name || !form.price || !form.category_id) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please fill in all required fields." });
      return;
    }

    if (images.length === 0) {
      toast({ variant: "destructive", title: "Images Required", description: "Please upload at least one product image." });
      return;
    }

    const variantSkus = new Set();
    for (const v of variants) {
      if (!v.sku) continue;
      if (variantSkus.has(v.sku)) {
        toast({ variant: "destructive", title: "Duplicate Variant SKU", description: `The SKU "${v.sku}" is used more than once among variants.` });
        setSubmitting(false);
        return;
      }
      variantSkus.add(v.sku);
    }

    const payload = {
      ...form,
      price: Number(form.price),
      mrp: Number(form.mrp || form.price),
      stock_quantity: Number(form.stock_quantity),
      weight: Number(form.weight) || 0,
      length: Number(form.length) || 0,
      breadth: Number(form.breadth) || 0,
      height: Number(form.height) || 0,
      images: images,
      variants: variants,
      is_active: true
    };

    console.log("DEPLOYING PRODUCT PAYLOAD:", payload);

    try {
      let res;
      if (isEditMode) {
        res = await updateProduct(id, payload);
        if (res && res.success) {
          toast({ title: "Product Updated", description: `${form.name} has been updated successfully.` });
          navigate("/admin/products");
        } else {
          toast({ variant: "destructive", title: "Update Failed", description: res?.error || "Failed to update product details." });
        }
      } else {
        res = await addProduct(payload);
        if (res && res.success) {
          setSuccessData({ name: form.name, category: categories.find(c => c.category_id === form.category_id)?.name, image: images[0].url });
          toast({ title: "Product Added", description: `${form.name} is now live.` });
        } else {
          toast({ variant: "destructive", title: "Registration Failed", description: res?.error || "This SKU might already exist in the database." });
        }
      }
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "System Error", description: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white rounded-[3.5rem] w-full max-w-[450px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-700">
          <div className="relative h-48 bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center overflow-hidden">
             <div className="bg-white p-6 rounded-[2rem] shadow-2xl relative z-10">
               <CheckCircle2 className="text-emerald-500" size={64} strokeWidth={3} />
             </div>
             <div className="absolute top-[-20%] left-[-20%] w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
          </div>
          <div className="p-12 flex flex-col items-center text-center">
             <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Product Added!</h2>
             <p className="text-lg text-slate-500 mb-10 leading-relaxed font-bold">
               <span className="text-slate-950 font-black">"{successData.name}"</span> has been added to the catalog.
             </p>
             <div className="w-32 h-32 rounded-[2rem] border-4 border-slate-50 overflow-hidden mb-12 shadow-2xl shadow-emerald-500/10 transition-transform hover:rotate-6">
               <img src={successData.image} alt="Product" className="w-full h-full object-cover" />
             </div>
             <Button onClick={() => navigate("/admin/products")} className="w-full h-16 rounded-[1.5rem] bg-slate-950 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-900 transition-all shadow-xl active:scale-95">
               Back to Products
             </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-24 px-4 animate-in fade-in duration-700">
      
      {/* Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-12 mt-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate("/admin/products")} 
            className="h-16 w-16 flex items-center justify-center bg-white border border-slate-100 rounded-[1.5rem] text-slate-400 hover:text-slate-950 hover:border-slate-300 transition-all shadow-sm active:scale-90"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none">
              {isEditMode ? "Edit Product" : "Add New Product"}
            </h1>
            <p className="text-base text-slate-500 font-bold mt-3 opacity-70">
              {isEditMode ? "Update product details and stock availability." : "Fill in the details below to add a new product to your store."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => navigate("/admin/products")} className="h-16 px-10 rounded-[1.5rem] bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95">
              Discard
           </button>
           <button 
             onClick={handleSubmit} 
             disabled={submitting} 
             className="h-16 px-12 rounded-[1.5rem] bg-slate-950 text-white text-xs font-black uppercase tracking-widest hover:bg-violet-600 transition-all shadow-2xl shadow-slate-950/20 active:scale-95 flex items-center gap-3"
           >
             {submitting ? "Saving..." : <><Save size={20} /> {isEditMode ? "Save Changes" : "Save Product"}</>}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        
        {/* Main Configuration Columns */}
        <div className="xl:col-span-2 space-y-10">
          
          {/* Section 1: Basic Protocol */}
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
              <div className="p-3 bg-violet-50 rounded-2xl text-violet-600">
                <ShoppingBag size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-950 tracking-tight">Product Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className={labelClass}>Product Name *</label>
                <input 
                  name="name" value={form.name} onChange={handleChange} 
                  placeholder="e.g. Minimalist Velvet Armchair" 
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>SKU Code</label>
                <input 
                  name="sku" value={form.sku} onChange={handleChange} 
                  placeholder="e.g. FUR-ARM-VLT-001" 
                  className={cn(inputClass, "font-mono")}
                />
              </div>
              <div>
                <label className={labelClass}>Default Color</label>
                <input 
                  name="color" value={form.color} onChange={handleChange} 
                  placeholder="e.g. Midnight Blue" 
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Description *</label>
                <textarea 
                  name="description" value={form.description} onChange={handleChange} 
                  placeholder="Enter a detailed description of your product..." 
                  className="w-full min-h-[180px] p-6 rounded-[1.5rem] bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all text-sm font-bold text-slate-800 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Financial Matrix */}
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
             <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                  <IndianRupee size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-950 tracking-tight">Pricing & Inventory</h3>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div>
                  <label className={labelClass}>Sale Price *</label>
                  <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>MRP (Original Price)</label>
                  <input name="mrp" type="number" value={form.mrp} onChange={handleChange} placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Total Stock *</label>
                  <input name="stock_quantity" type="number" value={form.stock_quantity} onChange={handleChange} placeholder="0" className={inputClass} />
                </div>
             </div>
          </div>

          {/* Section 3: Variant Architecture */}
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
            <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <Layers size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-950 tracking-tight">Product Variants</h3>
            </div>
            
            <div className="bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="sm:col-span-1">
                  <label className={labelClass}>Parameter</label>
                  <select name="name" value={currentVariant.name} onChange={handleVariantChange} className="w-full h-14 px-4 rounded-2xl bg-white border border-slate-200 text-sm font-black appearance-none cursor-pointer">
                    <option value="Color">Color</option>
                    <option value="Material">Material</option>
                    <option value="Size">Size</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className={labelClass}>Value</label>
                  <input name="value" value={currentVariant.value} onChange={handleVariantChange} placeholder="Red" className="w-full h-14 px-5 rounded-2xl bg-white border border-slate-200 text-sm font-black" />
                </div>
                <div className="sm:col-span-1">
                  <label className={labelClass}>Delta Price</label>
                  <input name="price" type="number" value={currentVariant.price} onChange={handleVariantChange} placeholder="+" className="w-full h-14 px-5 rounded-2xl bg-white border border-slate-200 text-sm font-black" />
                </div>
                <div className="sm:col-span-1">
                  <label className={labelClass}>Stock</label>
                  <input name="stock" type="number" value={currentVariant.stock} onChange={handleVariantChange} placeholder="0" className="w-full h-14 px-5 rounded-2xl bg-white border border-slate-200 text-sm font-black" />
                </div>
                <div className="sm:col-span-1 flex items-end">
                   <button type="button" onClick={addVariant} className="w-full h-14 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-600 transition-all shadow-lg active:scale-95">
                      Add Option
                   </button>
                </div>
              </div>

              {variants.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-100">
                  {variants.map((v, i) => (
                    <div key={i} className="bg-white border border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm group/v animate-in zoom-in duration-300">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">{v.name}:</span>
                        <span className="text-sm font-black text-slate-900">{v.value}</span>
                      </div>
                      {v.price && <span className="text-[11px] font-black text-emerald-600">₹{v.price}</span>}
                      <button type="button" onClick={() => removeVariant(i)} className="text-rose-400 hover:text-rose-600 transition-colors p-1"><X size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Visual Assets */}
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
             <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                  <ImageIcon size={24} />
                </div>
                <h3 className="text-2xl font-black text-slate-950 tracking-tight">Product Images</h3>
             </div>
             
             <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-12 text-center hover:border-violet-500/20 transition-all bg-slate-50/30 group/upload">
                <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="admin-images" />
                <label htmlFor="admin-images" className="cursor-pointer block group-hover/upload:scale-105 transition-transform duration-500">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-xl text-violet-600 mb-6 group-hover/upload:rotate-12 transition-all">
                     <Upload size={32} />
                  </div>
                  <div className="text-xl font-black text-slate-900 mb-2">Upload Product Images</div>
                  <div className="text-sm text-slate-400 font-bold">Supported formats: JPEG, PNG</div>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mt-12">
                   {images.map((img, i) => (
                     <div key={i} className="relative group/img flex flex-col items-center gap-4 animate-in zoom-in duration-500">
                        <div className="relative w-full aspect-square bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden p-3 group-hover/img:scale-110 transition-transform duration-500">
                           <img src={img.url} className="w-full h-full object-cover rounded-2xl shadow-inner" alt="Preview" />
                           <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-rose-500 text-white w-8 h-8 rounded-full text-xs shadow-xl opacity-0 group-hover/img:opacity-100 transition-all hover:scale-110 flex items-center justify-center">
                              <X size={14} strokeWidth={3} />
                           </button>
                        </div>

                        {variants.length > 0 && (
                          <select
                            value={img.variantTempId || "none"}
                            onChange={(e) => tagImageToVariant(i, e.target.value)}
                            className="w-full h-10 px-3 rounded-xl bg-slate-100 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-violet-500/10 cursor-pointer border-none"
                          >
                            <option value="none">Main Image</option>
                            {variants.map((v) => (
                              <option key={v.tempId} value={v.tempId}>{v.name}: {v.value}</option>
                            ))}
                          </select>
                        )}
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar Configuration */}
        <div className="space-y-10">
           
           {/* Section 5: Categorization Matrix */}
           <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
              <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                    <Layers size={20} />
                 </div>
                 <h3 className="text-xl font-black text-slate-950 tracking-tight">Product Category</h3>
              </div>
              
              <div className="space-y-6">
                 <div>
                    <label className={labelClass}>Target Seller</label>
                    <select name="seller_id" value={form.seller_id} onChange={handleChange} className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black appearance-none cursor-pointer">
                       <option value="">Platform Owned (Admin)</option>
                       {sellers.map((sel) => (
                         <option key={sel.id} value={sel.id}>{sel.name}</option>
                       ))}
                    </select>
                 </div>
                 <div>
                    <label className={labelClass}>Category *</label>
                    <select name="category_id" value={form.category_id} onChange={handleChange} className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black appearance-none cursor-pointer">
                       <option value="">Select Category</option>
                       {categories.map((cat) => (
                         <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                       ))}
                    </select>
                 </div>
                 <div>
                    <label className={labelClass}>Room Type</label>
                    <select name="room" value={form.room} onChange={handleChange} className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black appearance-none cursor-pointer">
                       <option value="">Select Room</option>
                       <option value="Living Room">Living Room</option>
                       <option value="Bedroom">Bedroom</option>
                       <option value="Kitchen">Kitchen</option>
                       <option value="Dining Room">Dining Room</option>
                       <option value="Office">Office</option>
                       <option value="Bathroom">Bathroom</option>
                    </select>
                 </div>
                 <div>
                    <label className={labelClass}>Brand</label>
                    <input name="brand" value={form.brand} onChange={handleChange} placeholder="Brand Name" className={inputClass} />
                 </div>
              </div>
           </div>

           {/* Section 6: Physical Topology */}
           <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
              <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
                    <Ruler size={20} />
                 </div>
                 <h3 className="text-xl font-black text-slate-950 tracking-tight">Dimensions & Weight</h3>
              </div>
              <div className="grid grid-cols-2 gap-5">
                 <div className="col-span-2">
                    <label className={labelClass}>Weight (KG)</label>
                    <input name="weight" type="number" step="0.01" value={form.weight} onChange={handleChange} placeholder="0.00" className={inputClass} />
                 </div>
                 <div>
                    <label className={labelClass}>Length (CM)</label>
                    <input name="length" type="number" value={form.length} onChange={handleChange} placeholder="0" className={inputClass} />
                 </div>
                 <div>
                    <label className={labelClass}>Breadth (CM)</label>
                    <input name="breadth" type="number" value={form.breadth} onChange={handleChange} placeholder="0" className={inputClass} />
                 </div>
                 <div>
                    <label className={labelClass}>Height (CM)</label>
                    <input name="height" type="number" value={form.height} onChange={handleChange} placeholder="0" className={inputClass} />
                 </div>
              </div>
           </div>

           {/* Deployment Summary */}
           <div className="bg-slate-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-700">
              <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                       <Settings size={20} className="text-violet-400" />
                    </div>
                    <h4 className="text-xl font-black tracking-tight">Ready to Save?</h4>
                 </div>
                 <p className="text-violet-200/60 text-sm leading-relaxed font-bold italic mb-10">
                    Make sure all product details are correct before saving. You can edit them anytime later.
                 </p>
                 <button 
                   onClick={handleSubmit}
                   disabled={submitting}
                   className="w-full h-16 bg-white text-slate-950 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:bg-violet-50 transition-all active:scale-95 shadow-xl shadow-white/5"
                 >
                    {submitting ? "Saving..." : "Save Product"}
                 </button>
              </div>
              <div className="absolute top-[-20%] right-[-20%] w-60 h-60 bg-violet-600/20 rounded-full blur-[80px]"></div>
           </div>
        </div>
      </div>
    </div>
  );
}
