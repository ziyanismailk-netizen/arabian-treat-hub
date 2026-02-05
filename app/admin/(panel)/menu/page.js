"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, addDoc, onSnapshot, deleteDoc, 
  doc, updateDoc, query, orderBy 
} from "firebase/firestore";
import Papa from "papaparse";

export default function MenuManager() {
  // --- 1. STATE MANAGEMENT ---
  const [items, setItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ 
    name: "", price: "", category: "", diet: "NON-VEG", sizeLabel: "", chest: "", style: "NORMAL", imageUrl: "" 
  });

  // --- 2. DATA SYNC ---
  useEffect(() => {
    const q = query(collection(db, "menu"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // --- 3. HELPER: IMAGE MAPPING ---
  const getCategoryFile = (cat) => {
    if (!cat) return "arabian.jpg";
    const clean = cat.trim().toLowerCase().replace(/\s+/g, '_').replace(/[']/g, '').replace(/[&]/g, 'and');
    return `${clean}.jpg`;
  };

  // --- 4. CSV IMPORT WITH PC & HEADER LOGIC ---
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = results.meta.fields.map(h => h.trim()); 
        for (const row of results.data) {
          const rawName = row.Item || row.item || "";
          if (!rawName) continue;

          // MERGE QUANTITY (1 PC, 6 PC)
          const qtySuffix = row.Quantity ? ` ${row.Quantity.trim()}` : "";
          const finalName = `${rawName}${qtySuffix}`.toUpperCase().trim();

          const pushItem = async (priceVal, sizeLabel = "") => {
            if (priceVal && priceVal !== "" && priceVal !== "Seasonal") {
              const diet = row.Type?.toUpperCase().trim() === "VEG" ? "VEG" : "NON-VEG";
              const category = (row.Category || "GENERAL").toUpperCase().trim();
              await addDoc(collection(db, "menu"), { 
                name: finalName, 
                price: Number(priceVal), 
                category: category,
                sizeLabel: sizeLabel.toUpperCase(),
                diet: diet,
                imageUrl: diet === "VEG" ? "/veg.jpg" : `/categories/${getCategoryFile(category)}`,
                chest: row.Chest || "",
                style: row.DRY ? "DRY" : (row.Gravy ? "GRAVY" : "NORMAL"),
                info: row.info || row.Info || ""
              });
            }
          };

          // MAP ALL HEADERS
          headers.forEach(header => {
            const h = header.toLowerCase().trim();
            if (["qtr", "half", "full", "chest", "price"].includes(h)) {
              pushItem(row[header], h === "price" ? "" : h);
            }
          });
        }
        setIsProcessing(false);
        alert("Bulk Sync Complete!");
      }
    });
  };

  // --- 5. MANUAL ACTIONS ---
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const isVeg = formData.diet === "VEG";
    const data = {
      name: formData.name.toUpperCase().trim(),
      price: Number(formData.price),
      category: formData.category.toUpperCase().trim(),
      diet: formData.diet,
      sizeLabel: formData.sizeLabel.toUpperCase().trim(),
      chest: formData.chest.trim(),
      style: formData.style,
      imageUrl: formData.imageUrl.trim() || (isVeg ? "/veg.jpg" : `/categories/${getCategoryFile(formData.category)}`)
    };

    if (editId) {
      await updateDoc(doc(db, "menu", editId), data);
      setEditId(null);
    } else {
      await addDoc(collection(db, "menu"), data);
    }
    setFormData({ name: "", price: "", category: "", diet: "NON-VEG", sizeLabel: "", chest: "", style: "NORMAL", imageUrl: "" });
  };

  const handleClearAll = async () => {
    if (!confirm("⚠️ DELETE ENTIRE DATABASE?")) return;
    setIsProcessing(true);
    try {
      const deletePromises = items.map(i => deleteDoc(doc(db, "menu", i.id)));
      await Promise.all(deletePromises);
    } catch (e) { console.error(e); }
    setIsProcessing(false);
  };

  // --- 6. RENDER DATA ---
  const nonVeg = items.filter(i => i.diet?.toUpperCase() !== "VEG");
  const veg = items.filter(i => i.diet?.toUpperCase() === "VEG");

  return (
    <>
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b-2 border-emerald-100 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold italic uppercase tracking-tighter text-emerald-950 drop-shadow-lg">Menu Manager</h1>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mt-1">{items.length} Items Live</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <button onClick={handleClearAll} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl border-2 border-red-900 font-black uppercase shadow-lg transition-all">Bulk WIPE</button>
          <label className="bg-white/90 px-4 py-2 rounded-2xl border-2 border-emerald-200 text-black font-bold shadow flex items-center gap-2 cursor-pointer hover:border-emerald-400 transition-all">
            <span>📥 Import CSV</span>
            <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
          </label>
        </div>
      </div>
      <div className="w-full min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-0 font-sans text-black">
        {/* Modern Manual Entry Bar */}
        <form onSubmit={handleManualSubmit} className="w-full bg-white/70 backdrop-blur-lg border-2 border-emerald-200 rounded-3xl shadow-2xl flex flex-wrap gap-6 items-end p-8 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-extrabold uppercase block mb-1 text-emerald-900 flex items-center gap-1"><span>🍽️</span> Item Name</label>
            <input type="text" className="w-full p-3 border-2 border-emerald-200 rounded-xl uppercase font-bold bg-white/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="w-40">
            <label className="text-xs font-extrabold uppercase block mb-1 text-emerald-900 flex items-center gap-1"><span>📂</span> Category</label>
            <input type="text" className="w-full p-3 border-2 border-emerald-200 rounded-xl uppercase font-bold bg-white/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
          </div>
          <div className="w-24">
            <label className="text-xs font-extrabold uppercase block mb-1 text-emerald-900 flex items-center gap-1"><span>💸</span> Price</label>
            <input type="number" className="w-full p-3 border-2 border-emerald-200 rounded-xl font-bold bg-white/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
          </div>
          <div className="w-28">
            <label className="text-xs font-extrabold uppercase block mb-1 text-emerald-900 flex items-center gap-1"><span>🥗</span> Diet</label>
            <select className="w-full p-3 border-2 border-emerald-200 rounded-xl font-black bg-white/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow" value={formData.diet} onChange={e => setFormData({...formData, diet: e.target.value})}>
              <option value="NON-VEG">NON-VEG</option>
              <option value="VEG">VEG</option>
            </select>
          </div>
          <div className="w-24">
            <label className="text-xs font-extrabold uppercase block mb-1 text-emerald-900 flex items-center gap-1"><span>🔖</span> Size Label</label>
            <input type="text" className="w-full p-3 border-2 border-emerald-200 rounded-xl font-bold bg-white/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow" value={formData.sizeLabel} onChange={e => setFormData({...formData, sizeLabel: e.target.value})} placeholder="e.g. QTR, HALF" />
          </div>
          <div className="w-24">
            <label className="text-xs font-extrabold uppercase block mb-1 text-emerald-900 flex items-center gap-1"><span>🦴</span> Chest</label>
            <input type="text" className="w-full p-3 border-2 border-emerald-200 rounded-xl font-bold bg-white/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow" value={formData.chest} onChange={e => setFormData({...formData, chest: e.target.value})} placeholder="Chest info" />
          </div>
          <div className="w-28">
            <label className="text-xs font-extrabold uppercase block mb-1 text-emerald-900 flex items-center gap-1"><span>🍲</span> Style</label>
            <select className="w-full p-3 border-2 border-emerald-200 rounded-xl font-black bg-white/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow" value={formData.style} onChange={e => setFormData({...formData, style: e.target.value})}>
              <option value="DRY">DRY</option>
              <option value="GRAVY">GRAVY</option>
            </select>
          </div>
          <div className="w-40">
            <label className="text-xs font-extrabold uppercase block mb-1 text-emerald-900 flex items-center gap-1"><span>🖼️</span> Image URL (optional)</label>
            <input type="text" className="w-full p-3 border-2 border-emerald-200 rounded-xl font-bold bg-white/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} placeholder="/categories/xyz.jpg" />
          </div>
          <div className="flex-1 flex items-end justify-end min-w-[200px]">
            <button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white px-10 py-3 rounded-2xl border-2 border-emerald-900 font-black uppercase text-lg shadow-lg transition-all duration-150">
              {editId ? "Update" : "Add Item"}
            </button>
          </div>
        </form>

        {/* Menu Items Grid */}
        <div className="w-full max-w-7xl mx-auto space-y-16 mt-10 pb-20">
          {/* VEG SECTION */}
          {veg.length > 0 && (
            <section>
              <h2 className="text-2xl font-black text-green-700 uppercase mb-6 border-l-8 border-green-400 pl-4 tracking-tight drop-shadow">🥦 Veg Items <span className='text-green-400'>({veg.length})</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                {veg.map(item => (
                  <div key={item.id} className="bg-white/80 backdrop-blur-lg border-2 border-green-200 rounded-3xl p-5 flex flex-col shadow-xl hover:scale-[1.03] transition-all">
                    <div className="h-24 w-full bg-slate-100 rounded-xl overflow-hidden border-2 border-green-300 mb-3 relative flex items-center justify-center">
                      <img src="/veg.jpg" className="w-full h-full object-cover" onError={e => e.target.src="/logo.jpg"} />
                    </div>
                    <h3 className="font-black text-xs uppercase truncate text-green-900">{item.name}</h3>
                    {item.info && <div className="text-[11px] text-green-700 font-normal mt-1 mb-1"><span className="font-bold">Item Info:</span> {item.info}</div>}
                    {item.sizeLabel && <span className="bg-green-900 text-white text-[10px] px-2 rounded uppercase w-max mb-1 mt-1">{item.sizeLabel}</span>}
                    <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-green-700">
                      {item.style && item.style !== 'NORMAL' && <span className="bg-green-100 px-2 rounded">{item.style}</span>}
                    </div>
                    <p className="font-extrabold text-xl mt-auto text-green-800">₹{item.price}</p>
                    <div className="flex gap-2 mt-3 pt-2 border-t border-green-100">
                       <button onClick={() => {setEditId(item.id); setFormData(item); window.scrollTo(0,0);}} className="flex-1 text-xs font-black text-blue-700 uppercase hover:underline">Edit</button>
                       <button onClick={() => deleteDoc(doc(db, "menu", item.id))} className="flex-1 text-xs font-black text-red-600 uppercase hover:underline">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* NON-VEG SECTION */}
          {nonVeg.length > 0 && (
            <section>
              <h2 className="text-2xl font-black text-red-700 uppercase mb-6 border-l-8 border-red-400 pl-4 tracking-tight drop-shadow">🍗 Non-Veg Items <span className='text-red-400'>({nonVeg.length})</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                {nonVeg.map(item => (
                  <div key={item.id} className="bg-white/80 backdrop-blur-lg border-2 border-red-200 rounded-3xl p-5 flex flex-col shadow-xl hover:scale-[1.03] transition-all">
                    <div className="h-24 w-full bg-slate-100 rounded-xl overflow-hidden border-2 border-red-300 mb-3 flex items-center justify-center">
                      <img src={item.imageUrl} className="w-full h-full object-cover" onError={e => e.target.src="/logo.jpg"} />
                    </div>
                    <h3 className="font-black text-xs uppercase truncate text-red-900">{item.name}</h3>
                    {item.info && <div className="text-[11px] text-red-700 font-normal mt-1 mb-1"><span className="font-bold">Item Info:</span> {item.info}</div>}
                    {item.sizeLabel && <span className="bg-red-900 text-white text-[10px] px-2 rounded uppercase w-max mb-1 mt-1">{item.sizeLabel}</span>}
                    <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-red-700">
                      {item.style && item.style !== 'NORMAL' && <span className="bg-red-100 px-2 rounded">{item.style}</span>}
                    </div>
                    <p className="font-extrabold text-xl mt-auto text-red-800">₹{item.price}</p>
                    <div className="flex gap-2 mt-3 pt-2 border-t border-red-100">
                       <button onClick={() => {setEditId(item.id); setFormData(item); window.scrollTo(0,0);}} className="flex-1 text-xs font-black text-blue-700 uppercase hover:underline">Edit</button>
                       <button onClick={() => deleteDoc(doc(db, "menu", item.id))} className="flex-1 text-xs font-black text-red-600 uppercase hover:underline">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}