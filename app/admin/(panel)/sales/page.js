"use client";
import { useState, useEffect } from "react";
import Papa from "papaparse";

// Remove duplicate export default and move handleExportCSV inside the correct SalesPage component
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, getDocs, deleteDoc } from "firebase/firestore";
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

  // --- CSV EXPORT ---
  const handleExportCSV = () => {
    if (!dailyOrders.length) return;
    // Flatten items for each order
    const rows = dailyOrders.flatMap(order => {
      if (!order.items || !order.items.length) {
        return [{
          BillNo: order.billNo || order.id.slice(0,5),
          Date: order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : '',
          Customer: order.customerPhone || "Walk-in",
          Area: order.deliveryDetails?.area || "Counter",
          Item: '',
          Qty: '',
          Amount: order.totalBill
        }];
      }
      return order.items.map(item => ({
        BillNo: order.billNo || order.id.slice(0,5),
        Date: order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : '',
        Customer: order.customerPhone || "Walk-in",
        Area: order.deliveryDetails?.area || "Counter",
        Item: item.name,
        Qty: item.qty,
        Amount: order.totalBill
      }));
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  const bulkWipeAllOrders = async () => {
    if (!confirm(`🗑️ DELETE ALL ${allOrders.length} ORDERS? This cannot be undone!`)) return;
    try {
      const snapshot = await getDocs(collection(db, "orders"));
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "orders", d.id)));
      await Promise.all(deletePromises);
      alert("✅ All orders deleted!");
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

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

  // --- QUICK STATS ---
  const averageBill = dailyOrders.length > 0 ? (dailyTotal / dailyOrders.length) : 0;
  const pieData = getPieData();
  const mostPopularItem = pieData.length > 0 ? pieData[0] : null;
  const totalItemsSold = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-0 font-sans text-black">
      {/* Sticky Date Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-emerald-100 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold italic uppercase tracking-tighter text-emerald-950 drop-shadow-lg">Sales Analytics</h1>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mt-1">
            Viewing Date: <span className="text-black underline">{selectedDate}</span>
            {selectedDate === businessDate && <span className="ml-2 bg-yellow-200 px-2 rounded text-[10px] no-underline">CURRENT SHIFT</span>}
          </p>
        </div>
        <div className="flex gap-3 items-center">
           <input 
             type="date" 
             value={selectedDate} 
             onChange={(e) => setSelectedDate(e.target.value)} 
             className="p-3 border-2 border-emerald-200 rounded-xl font-bold text-sm bg-white cursor-pointer focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow"
           />
           <button 
             onClick={printDayReport} 
             className="bg-emerald-900 text-white px-5 py-3 rounded-xl font-extrabold text-xs uppercase flex items-center gap-2 hover:bg-emerald-800 hover:scale-105 transition-all shadow-lg"
           >
             <span>🖨️</span> Print Summary
           </button>
           <button
             onClick={handleExportCSV}
             className="bg-blue-600 text-white px-5 py-3 rounded-xl font-extrabold text-xs uppercase flex items-center gap-2 hover:bg-blue-500 hover:scale-105 transition-all shadow-lg"
           >
             <span>⬇️</span> Export CSV
           </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="w-full flex flex-col md:flex-row gap-6 md:gap-10 justify-center items-center mt-8 mb-4 px-4">
        <div className="bg-white/90 backdrop-blur-lg border-2 border-emerald-900 rounded-3xl p-8 shadow-2xl flex-1 min-w-[220px]">
          <div className="text-xs font-black uppercase text-emerald-400">Avg. Bill Value</div>
          <div className="text-3xl font-extrabold text-emerald-900 mt-1">₹{averageBill.toFixed(0)}</div>
          <div className="text-[11px] font-bold text-emerald-400 mt-2">{dailyOrders.length} Bills</div>
        </div>
        <div className="bg-white/90 backdrop-blur-lg border-2 border-blue-400 rounded-3xl p-8 shadow-2xl flex-1 min-w-[220px]">
          <div className="text-xs font-black uppercase text-blue-400">Most Popular Item</div>
          <div className="text-3xl font-extrabold text-blue-600 mt-1">{mostPopularItem ? mostPopularItem.name : '—'}</div>
          <div className="text-[11px] font-bold text-blue-400 mt-2">{mostPopularItem ? mostPopularItem.value : 0} Sold</div>
        </div>
        <div className="bg-white/90 backdrop-blur-lg border-2 border-green-400 rounded-3xl p-8 shadow-2xl flex-1 min-w-[220px]">
          <div className="text-xs font-black uppercase text-green-400">Total Items Sold</div>
          <div className="text-3xl font-extrabold text-green-600 mt-1">{totalItemsSold}</div>
        </div>
      </div>

      {/* Floating Stats */}
      <div className="w-full flex flex-col md:flex-row gap-6 md:gap-10 justify-center items-center mt-2 mb-12 px-4">
        <div className="bg-white/80 backdrop-blur-lg border-2 border-emerald-900 rounded-3xl p-8 shadow-2xl flex-1 min-w-[220px]">
          <div className="text-xs font-black uppercase text-emerald-400">Total Sales</div>
          <div className="text-4xl font-extrabold text-emerald-900 mt-1">₹{dailyTotal}</div>
          <div className="text-[11px] font-bold text-emerald-400 mt-2">{dailyOrders.length} Bills</div>
        </div>
        <div className="bg-blue-50/80 backdrop-blur-lg border-2 border-blue-200 rounded-3xl p-8 shadow-2xl flex-1 min-w-[220px]">
          <div className="text-xs font-black uppercase text-blue-400">Monthly</div>
          <div className="text-4xl font-extrabold text-blue-600 mt-1">₹{monthlyTotal}</div>
        </div>
        <div className="bg-green-50/80 backdrop-blur-lg border-2 border-green-200 rounded-3xl p-8 shadow-2xl flex-1 min-w-[220px]">
          <div className="text-xs font-black uppercase text-green-400">Yearly</div>
          <div className="text-4xl font-extrabold text-green-600 mt-1">₹{yearlyTotal}</div>
        </div>
      </div>

      {/* Modern Chart Section */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12 px-4">
        <div className="bg-white/90 border-2 border-emerald-100 rounded-3xl p-8 shadow-2xl h-[370px] flex flex-col">
          <h3 className="text-lg font-extrabold uppercase mb-6 text-emerald-900 flex items-center gap-2">📈 Sales Trend</h3>
          <div className="flex-1 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getLineData()}><CartesianGrid strokeDasharray="3 3" stroke="#eee"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Line type="monotone" dataKey="sales" stroke="#059669" strokeWidth={3} dot={{r:4}}/></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white/90 border-2 border-emerald-100 rounded-3xl p-8 shadow-2xl h-[370px] flex flex-col">
          <h3 className="text-lg font-extrabold uppercase mb-6 text-emerald-900 flex items-center gap-2">🍕 Top Items</h3>
          <div className="flex-1 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getPieData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name }) => name}
                  labelLine={false}
                  stroke="#fff"
                  isAnimationActive={true}
                >
                  {getPieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} filter="url(#shadow)" />
                  ))}
                </Pie>
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#059669" floodOpacity="0.15" />
                  </filter>
                </defs>
                {/* Center label */}
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="bold" fill="#059669">
                  Top
                </text>
                <Tooltip
                  contentStyle={{ borderRadius: 12, boxShadow: '0 2px 12px #05966922' }}
                  formatter={(value, name, props) => [`${value} (${((value / getPieData().reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%)`, name]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ borderRadius: 16, background: '#f0fdf4', padding: 8, marginTop: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modern Transaction Table */}
      <div className="w-full px-4 pb-10">
        <div className="bg-white/90 border-2 border-emerald-100 rounded-3xl overflow-hidden shadow-2xl">
          <div className="bg-emerald-50 p-6 border-b border-emerald-100 flex items-center justify-between">
            <span className="font-extrabold uppercase text-xs tracking-widest text-emerald-900">Transaction Log</span>
            <span className="text-xs text-emerald-400 font-bold">{dailyOrders.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-900 text-white uppercase text-xs font-extrabold">
                <tr><th className="p-4">Bill No</th><th className="p-4">Customer</th><th className="p-4 text-right">Amount</th></tr>
              </thead>
              <tbody className="font-bold divide-y divide-emerald-50">
                {dailyOrders.length === 0 ? (
                  <tr><td colSpan="3" className="p-8 text-center text-emerald-300">No confirmed sales for this date.</td></tr>
                ) : (
                  dailyOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-emerald-50 transition-all">
                      <td className="p-4">#{order.billNo || order.id.slice(0,5)}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span>{order.customerPhone || "Walk-in"}</span>
                          <span className="text-[10px] text-emerald-400 font-normal">{order.deliveryDetails?.area || "Counter"}</span>
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
      </div>
    </div>
  );
}