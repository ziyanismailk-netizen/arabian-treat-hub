"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function SalesPage() {
  const [allOrders, setAllOrders] = useState([]);
  const [dailyOrders, setDailyOrders] = useState([]);
  
  // 🕒 1. Setup Dates
  const getLocalBusinessDate = () => {
    const d = new Date();
    if (d.getHours() < 4) d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA');
  };

  const [businessDate, setBusinessDate] = useState(getLocalBusinessDate()); 
  const [selectedDate, setSelectedDate] = useState(getLocalBusinessDate());
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  // 🔴 STRICT WHITELIST (Money In The Bank)
  // Only count these statuses as "Sales"
  const VALID_SALES_STATUSES = [
    'Accepted', 
    'Preparing', 
    'Ready', 
    'Out_for_Delivery', 
    'Delivered', 
    'History'
  ];

  // 2. Sync with Store Settings (The "Shift Date")
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "store"), (docSnap) => {
      if (docSnap.exists()) {
        const dbDate = docSnap.data().businessDate;
        if (dbDate) {
          setBusinessDate(dbDate);
          // ⚡ CORE FIX: Auto-select the active shift date so numbers match Dashboard
          setSelectedDate(dbDate);
        }
      }
    });
    return () => unsub();
  }, []);

  // 3. Listen to Orders
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllOrders(docs);
    });
    return () => unsubscribe();
  }, []);

  // 4. Strict Filtering Logic
  useEffect(() => {
    if (!selectedDate) return;

    const filtered = allOrders.filter(order => {
      if (!order.createdAt) return false;
      
      // Calculate Order's Business Date (4 AM Rule)
      const d = new Date(order.createdAt.seconds * 1000);
      if (d.getHours() < 4) d.setDate(d.getDate() - 1);
      const orderDateStr = d.toLocaleDateString('en-CA');

      // Rule 1: Must match the selected date
      if (orderDateStr !== selectedDate) return false;

      // Rule 2: Must be a VALID SALE (No Pending, No Cancelled, No Archived)
      return VALID_SALES_STATUSES.includes(order.status);
    });
    
    setDailyOrders(filtered);
  }, [selectedDate, allOrders]);

  // --- CALCULATIONS ---
  const calculateTotal = (orders) => orders.reduce((sum, o) => sum + (Number(o.totalBill) || 0), 0);
  
  const dailyTotal = calculateTotal(dailyOrders);
  
  const monthlyTotal = calculateTotal(allOrders.filter(o => {
    if (!o.createdAt) return false;
    const d = new Date(o.createdAt.seconds * 1000); 
    const t = new Date(selectedDate);
    // Strict Status Check + Same Month + Same Year
    return VALID_SALES_STATUSES.includes(o.status) && 
           d.getMonth() === t.getMonth() && 
           d.getFullYear() === t.getFullYear();
  }));

  const yearlyTotal = calculateTotal(allOrders.filter(o => {
    if (!o.createdAt) return false;
    const d = new Date(o.createdAt.seconds * 1000);
    // Strict Status Check + Same Year
    return VALID_SALES_STATUSES.includes(o.status) && 
           d.getFullYear() === new Date(selectedDate).getFullYear();
  }));

  const getLineData = () => {
    const data = {}; const t = new Date(selectedDate);
    allOrders.forEach(o => {
      if (!VALID_SALES_STATUSES.includes(o.status)) return;
      const d = new Date(o.createdAt?.seconds*1000);
      if(d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear()) { 
        const day = d.getDate(); 
        data[day] = (data[day]||0) + Number(o.totalBill); 
      }
    });
    return Object.keys(data).map(day => ({ name: `Day ${day}`, sales: data[day] }));
  };

  const getPieData = () => {
    const itemCounts = {};
    dailyOrders.forEach(order => { 
      order.items?.forEach(item => { 
        itemCounts[item.name] = (itemCounts[item.name] || 0) + Number(item.qty); 
      }); 
    });
    return Object.keys(itemCounts).map(key => ({ name: key, value: itemCounts[key] })).sort((a, b) => b.value - a.value).slice(0, 5);
  };

  const printDayReport = () => {
    const printWindow = window.open('', '', 'width=350,height=600');
    const [y, m, d] = selectedDate.split('-');
    const dateStr = `${d}/${m}/${y}`;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Report ${dateStr}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@700&display=swap'); 
            body { 
              font-family: 'Courier Prime', monospace; 
              font-size: 16px; /* BIG BASE SIZE */
              font-weight: 900; /* MAX BOLD */
              width: 300px; 
              margin: 0 auto; 
              padding: 5px 0; 
            } 
            .center { text-align: center; } 
            .dashed { border-bottom: 3px dashed black; margin: 8px 0; } 
            
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-weight: 900; } 
            .big { font-size: 20px; font-weight: 900; }
            .huge { font-size: 24px; font-weight: 900; text-transform: uppercase; }
            
            .customer-info { font-size: 12px; margin-bottom: 6px; color: #000; font-weight: 900; }
            
            .header-title { font-size: 24px; font-weight: 900; margin-top: 0; line-height: 1.1; }
          </style>
        </head>
        <body>
          <div class="center header-title">ARABIAN TREAT HUB</div>
          <div class="center big">SALES SUMMARY</div>
          <div class="center" style="font-size: 14px;">DATE: ${dateStr}</div>
          
          <div class="dashed"></div>
          
          <div class="row big"><span>TOTAL BILLS:</span><span>${dailyOrders.length}</span></div>
          <div class="row huge"><span>REVENUE:</span><span>₹${dailyTotal}</span></div>
          
          <div class="dashed"></div>
          <div class="center big" style="margin-bottom:10px;">DETAILED REPORT</div>
          
          ${dailyOrders.map(o => `
            <div style="border-bottom: 2px dashed #000; margin-bottom: 8px; padding-bottom: 4px;">
              <div class="row" style="font-size:16px;">
                <span>#${o.billNo || o.id.slice(0,5)}</span>
                <span>₹${o.totalBill}</span>
              </div>
              <div class="customer-info">
                PH: ${o.customerPhone || "N/A"}<br/>
                ${o.deliveryDetails?.area ? `AREA: ${o.deliveryDetails.area}` : "COUNTER SALE"}
              </div>
            </div>
          `).join('')}
          
          <div class="dashed"></div>
          <div class="center big">*** END OF REPORT ***</div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // ⚡ AUTO-PRINT TRIGGER
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };
  return (
    <div className="w-full p-6 font-sans text-black">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-3xl font-[1000] italic uppercase tracking-tighter">Sales Analytics</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Viewing Date: <span className="text-black underline">{selectedDate}</span>
            {selectedDate === businessDate && <span className="ml-2 bg-yellow-200 px-2 rounded text-[10px] no-underline">CURRENT SHIFT</span>}
          </p>
        </div>
        <div className="flex gap-2">
           <input 
             type="date" 
             value={selectedDate} 
             onChange={(e) => setSelectedDate(e.target.value)} 
             className="p-3 border-2 border-black rounded-lg font-bold text-sm bg-white cursor-pointer"
           />
           <button 
             onClick={printDayReport} 
             className="bg-black text-white px-4 py-3 rounded-lg font-bold text-xs uppercase flex items-center gap-2 hover:scale-105 transition-transform"
           >
             <span>🖨️</span> Print Summary
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border-2 border-black rounded-xl p-6 shadow-sm">
          <div className="text-xs font-black uppercase text-slate-400">Total Sales</div>
          <div className="text-3xl font-[1000] mt-1">₹{dailyTotal}</div>
          <div className="text-[10px] font-bold text-slate-400 mt-2">{dailyOrders.length} Bills</div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-6 shadow-sm">
          <div className="text-xs font-black uppercase text-blue-400">Monthly</div>
          <div className="text-3xl font-[1000] text-blue-600 mt-1">₹{monthlyTotal}</div>
        </div>
        <div className="bg-green-50 border-2 border-green-100 rounded-xl p-6 shadow-sm">
          <div className="text-xs font-black uppercase text-green-400">Yearly</div>
          <div className="text-3xl font-[1000] text-green-600 mt-1">₹{yearlyTotal}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white border-2 border-slate-100 rounded-xl p-6 shadow-sm h-[350px]">
          <h3 className="text-sm font-black uppercase mb-4 text-slate-400">📈 Sales Trend</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getLineData()}><CartesianGrid strokeDasharray="3 3" stroke="#eee"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#000" strokeWidth={3} dot={{r:4}}/></LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border-2 border-slate-100 rounded-xl p-6 shadow-sm h-[350px]">
          <h3 className="text-sm font-black uppercase mb-4 text-slate-400">🍕 Top Items</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie data={getPieData()} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">{getPieData().map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip/><Legend verticalAlign="bottom" height={36}/></PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <span className="font-black uppercase text-xs tracking-widest">Transaction Log</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-black text-white uppercase text-xs font-black">
            <tr><th className="p-4">Bill No</th><th className="p-4">Customer</th><th className="p-4 text-right">Amount</th></tr>
          </thead>
          <tbody className="font-bold divide-y divide-slate-100">
            {dailyOrders.length === 0 ? (
              <tr><td colSpan="3" className="p-8 text-center text-slate-400">No confirmed sales for this date.</td></tr>
            ) : (
              dailyOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="p-4">#{order.billNo || order.id.slice(0,5)}</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span>{order.customerPhone || "Walk-in"}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{order.deliveryDetails?.area || "Counter"}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">₹{order.totalBill}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}