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
    name: "", price: "", category: "", diet: "NON-VEG" 
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
                style: row.DRY ? "DRY" : (row.Gravy ? "GRAVY" : "NORMAL")
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
      imageUrl: isVeg ? "/veg.jpg" : `/categories/${getCategoryFile(formData.category)}`
    };

    if (editId) {
      await updateDoc(doc(db, "menu", editId), data);
      setEditId(null);
    } else {
      await addDoc(collection(db, "menu"), data);
    }
    setFormData({ name: "", price: "", category: "", diet: "NON-VEG" });
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
    <div className="max-w-7xl mx-auto p-4 font-mono space-y-8 pb-20">
      {/* HEADER BAR */}
      <div className="bg-[#064e3b] p-8 rounded-[2rem] border-4 border-black text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">ATH Admin</h1>
          <p className="text-xs font-bold text-emerald-400 mt-1 uppercase tracking-widest">{items.length} Items Live</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button onClick={handleClearAll} className="bg-red-600 px-6 py-2 rounded-xl border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1">Bulk WIPE</button>
          <div className="bg-white p-2 rounded-xl border-4 border-black text-black">
            <input type="file" accept=".csv" onChange={handleCsvUpload} className="text-xs font-bold" />
          </div>
        </div>
      </div>

      {/* MANUAL ENTRY BAR */}
      <form onSubmit={handleManualSubmit} className="bg-white border-4 border-black p-6 rounded-[2rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black uppercase block mb-1">Item Name</label>
          <input type="text" className="w-full p-2 border-2 border-black rounded-lg uppercase font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
        </div>
        <div className="w-40">
          <label className="text-[10px] font-black uppercase block mb-1">Category</label>
          <input type="text" className="w-full p-2 border-2 border-black rounded-lg uppercase font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required />
        </div>
        <div className="w-24">
          <label className="text-[10px] font-black uppercase block mb-1">Price</label>
          <input type="number" className="w-full p-2 border-2 border-black rounded-lg font-bold" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
        </div>
        <div className="w-28">
          <label className="text-[10px] font-black uppercase block mb-1">Diet</label>
          <select className="w-full p-2 border-2 border-black rounded-lg font-black" value={formData.diet} onChange={e => setFormData({...formData, diet: e.target.value})}>
            <option value="NON-VEG">NON-VEG</option>
            <option value="VEG">VEG</option>
          </select>
        </div>
        <button type="submit" className="bg-emerald-500 text-white px-8 py-2 rounded-lg border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          {editId ? "Update" : "Add Item"}
        </button>
      </form>

      {/* SEPARATE SECTIONS */}
      <div className="space-y-12">
        {/* VEG SECTION */}
        {veg.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-green-600 uppercase mb-4 border-l-8 border-green-600 pl-4">Veg Items ({veg.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {veg.map(item => (
                <div key={item.id} className="bg-white border-2 border-black p-3 rounded-2xl flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="h-20 w-full bg-slate-100 rounded-lg overflow-hidden border-2 border-black mb-2 relative">
                    <img src="/veg.jpg" className="w-full h-full object-cover" onError={e => e.target.src="/logo.jpg"} />
                  </div>
                  <h3 className="font-black text-[9px] uppercase truncate">{item.name}</h3>
                  {item.sizeLabel && <span className="bg-black text-white text-[7px] px-1 rounded uppercase w-max mb-1">{item.sizeLabel}</span>}
                  <p className="font-[1000] text-lg mt-auto">₹{item.price}</p>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                     <button onClick={() => {setEditId(item.id); setFormData(item); window.scrollTo(0,0);}} className="flex-1 text-[8px] font-black text-blue-600 uppercase">Edit</button>
                     <button onClick={() => deleteDoc(doc(db, "menu", item.id))} className="flex-1 text-[8px] font-black text-red-500 uppercase">Del</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NON-VEG SECTION */}
        {nonVeg.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-red-600 uppercase mb-4 border-l-8 border-red-600 pl-4">Non-Veg Items ({nonVeg.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {nonVeg.map(item => (
                <div key={item.id} className="bg-white border-2 border-black p-3 rounded-2xl flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="h-20 w-full bg-slate-100 rounded-lg overflow-hidden border-2 border-black mb-2">
                    <img src={item.imageUrl} className="w-full h-full object-cover" onError={e => e.target.src="/logo.jpg"} />
                  </div>
                  <h3 className="font-black text-[9px] uppercase truncate">{item.name}</h3>
                  {item.sizeLabel && <span className="bg-black text-white text-[7px] px-1 rounded uppercase w-max mb-1">{item.sizeLabel}</span>}
                  <p className="font-[1000] text-lg mt-auto">₹{item.price}</p>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                     <button onClick={() => {setEditId(item.id); setFormData(item); window.scrollTo(0,0);}} className="flex-1 text-[8px] font-black text-blue-600 uppercase">Edit</button>
                     <button onClick={() => deleteDoc(doc(db, "menu", item.id))} className="flex-1 text-[8px] font-black text-red-500 uppercase">Del</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}