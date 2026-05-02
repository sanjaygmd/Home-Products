import React, { useContext, useState, useEffect } from "react";
import { ProductContext } from "../../context/ProductContext/ProductContext";
import * as productService from "../../services/productService";
import { useAuth } from "../../context/AuthContext.jsx";

const AddProduct = ({ onClose }) => {
  const { addProduct } = useContext(ProductContext);
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]); // Array of { url, variantTempId }
  const [variants, setVariants] = useState([]);

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
    category_id: "1b81c1e2-9f44-4ec6-b596-f453e3452253", // Default to Furniture
    color: "",
    room: "",
  });

  const [currentVariant, setCurrentVariant] = useState({
    name: "Color",
    value: "",
    price: "",
    stock: "",
    sku: ""
  });

  useEffect(() => {
    const fetchCats = async () => {
      const res = await productService.getCategories();
      if (res.success) {
        setCategories(res.data);
        if (res.data.length > 0) {
          setForm(prev => ({ ...prev, category_id: res.data[0].category_id }));
        }
      }
    };
    fetchCats();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleVariantChange = (e) => {
    setCurrentVariant({ ...currentVariant, [e.target.name]: e.target.value });
  };

  const addVariant = () => {
    if (!currentVariant.value) return;
    const tempId = 'v_' + Math.random().toString(36).substr(2, 9);
    setVariants([...variants, { ...currentVariant, tempId }]);
    setCurrentVariant({ ...currentVariant, value: "", sku: "" });
  };

  const removeVariant = (index) => {
    const v = variants[index];
    setVariants(variants.filter((_, i) => i !== index));
    // Clear associations
    setImages(images.map(img => img.variantTempId === v.tempId ? { ...img, variantTempId: null } : img));
  };

  const handleImageChange = (e) => {
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

          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
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
    e.preventDefault();
    const sellerId = currentUser?.id;

    if (!sellerId) {
      alert("Please login as a seller to add products");
      return;
    }

    if (!form.name || !form.price || !form.category_id) {
      alert("Please fill required fields (Name, Price, Category)");
      return;
    }

    const payload = {
      ...form,
      seller_id: sellerId,
      price: Number(form.price),
      mrp: Number(form.mrp),
      stock_quantity: Number(form.stock_quantity),
      weight: Number(form.weight),
      length: Number(form.length),
      breadth: Number(form.breadth),
      height: Number(form.height),
      images: images, // Now sending array of objects
      variants: variants,
      slug: form.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
    };

    const res = await addProduct(payload);

    if (res.success) {
      onClose();
    } else {
      alert(res.error || "Failed to add product");
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Add New Product</h2>
            <p className="text-gray-500 mt-1">Setup variants and specific images</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <span className="text-2xl">✕</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="name" value={form.name} onChange={handleChange} placeholder="Product Name *" className={inputClass} required />
              <input name="sku" value={form.sku} onChange={handleChange} placeholder="Main SKU (e.g. FUR-CHAIR-001)" className={inputClass} />

               <textarea name="description" value={form.description} onChange={handleChange} placeholder="Product Description" rows="3" className={`${inputClass} md:col-span-2`} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Pricing & Inventory</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Selling Price (Customer Pays)</label>
                <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="Final price to customer *" className={inputClass} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">MRP (Original Price)</label>
                <input name="mrp" type="number" value={form.mrp} onChange={handleChange} placeholder="Original price before discount" className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Total Stock</label>
                <input name="stock_quantity" type="number" value={form.stock_quantity} onChange={handleChange} placeholder="Current inventory quantity *" className={inputClass} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Default Color</label>
                <input name="color" value={form.color} onChange={handleChange} placeholder="e.g. White" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">1. Create Variants First</h3>
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <select name="name" value={currentVariant.name} onChange={handleVariantChange} className={inputClass}>
                  <option value="Color">Color</option>
                  <option value="Material">Material</option>
                </select>
                <input name="value" value={currentVariant.value} onChange={handleVariantChange} placeholder="Value (e.g. Red)" className={inputClass} />
                <input name="price" type="number" value={currentVariant.price} onChange={handleVariantChange} placeholder="Price" className={inputClass} />
                <input name="stock" type="number" value={currentVariant.stock} onChange={handleVariantChange} placeholder="Stock" className={inputClass} />
                <button type="button" onClick={addVariant} className="bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                  Add Variant
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {variants.map((v, i) => (
                  <div key={i} className="bg-white border border-blue-200 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm animate-fadeIn">
                    <span className="text-xs font-bold text-blue-600 uppercase">{v.name}:</span>
                    <span className="text-sm font-medium">{v.value}</span>
                    <button type="button" onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">2. Upload & Tag Images</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors bg-gray-50/30">
              <input type="file" multiple accept="image/*" onChange={handleImageChange} className="hidden" id="product-images" />
              <label htmlFor="product-images" className="cursor-pointer block">
                <div className="text-blue-600 font-semibold mb-2">Click to upload photos</div>
                <div className="text-sm text-gray-400">Add photos for all variants</div>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8">
                {images.map((img, i) => (
                  <div key={i} className="relative group flex flex-col items-center gap-2">
                    <div className="relative w-full aspect-square bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-2">
                      <img src={img.url} className="w-full h-full object-contain rounded-lg" alt="Preview" />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </div>

                    {variants.length > 0 && (
                      <select
                        value={img.variantTempId || "none"}
                        onChange={(e) => tagImageToVariant(i, e.target.value)}
                        className="text-[10px] w-full p-1 border rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Categorization</h3>
              <div className="grid grid-cols-1 gap-4">
                <select name="category_id" value={form.category_id} onChange={handleChange} className={inputClass} required>
                  <option value="">Select Category * (Home Products Only)</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                  ))}
                </select>
                <select name="room" value={form.room} onChange={handleChange} className={inputClass}>
                  <option value="">Select Room / Space</option>
                  <option value="Living Room">Living Room</option>
                  <option value="Bedroom">Bedroom</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Dining Room">Dining Room</option>
                  <option value="Office">Office</option>
                  <option value="Bathroom">Bathroom</option>
                </select>
                <input name="brand" value={form.brand} onChange={handleChange} placeholder="Brand Name" className={inputClass} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Physical Specs</h3>
              <div className="grid grid-cols-2 gap-4">
                <input name="weight" type="number" step="0.01" value={form.weight} onChange={handleChange} placeholder="Weight (kg)" className={inputClass} />
                <input name="length" type="number" step="0.1" value={form.length} onChange={handleChange} placeholder="Length (cm)" className={inputClass} />
                <input name="breadth" type="number" step="0.1" value={form.breadth} onChange={handleChange} placeholder="Breadth (cm)" className={inputClass} />
                <input name="height" type="number" step="0.1" value={form.height} onChange={handleChange} placeholder="Height (cm)" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-100 transition-all hover:-translate-y-1 active:translate-y-0 text-lg">
              Publish Product with Variants
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;