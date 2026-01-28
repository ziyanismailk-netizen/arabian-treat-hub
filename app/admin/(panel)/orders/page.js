"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("Connecting...");
  const [activeTab, setActiveTab] = useState("Live");
  
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(liveOrders);
      setStatus("Connected & Listening ✅");
    });
    return () => unsubscribe();
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "Live") return ["Pending", "Accepted", "Preparing", "Ready", "Out_for_Delivery"].includes(order.status);
    if (activeTab === "Delivered") return order.status === "Delivered";
    if (activeTab === "History") return order.status === "History" || order.status === "Cancelled"; 
    return false;
  });

  const updateStatus = async (orderId, newStatus) => {
    await updateDoc(doc(db, "orders", orderId), { status: newStatus });
  };
  
  const acceptAndPrint = async (order) => {
    await updateStatus(order.id, "Preparing");
    printKOT(order);
  };

  const cancelOrder = async (order) => {
    const reason = prompt("Reason for cancellation? (Optional)");
    if (reason === null) return; 
    
    if (confirm("⚠️ Are you sure? This will remove the order from revenue.")) {
      await updateDoc(doc(db, "orders", order.id), { 
        status: "Cancelled",
        cancelReason: reason || "Admin Cancelled"
      });
    }
  };

  // 🖨️ KOT PRINT FUNCTION (Full Names Enabled)
  const printKOT = (order) => {
    const printWindow = window.open('', '', 'width=350,height=600');
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2,'0')}/${(today.getMonth()+1).toString().padStart(2,'0')}/${today.getFullYear().toString().slice(-2)}`;
    const timeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const billNo = order.billNo || order.id.slice(0, 6).toUpperCase();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${order.id}`;

    const deliveryFeeHtml = order.deliveryFee > 0 
      ? `<div class="row"><span class="col-item">Delivery Charge</span><span class="col-qty">-</span><span class="col-rate">${order.deliveryFee}</span><span class="col-amt">${order.deliveryFee}</span></div>` 
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill #${billNo}</title>
          <style>
            body { 
              font-family: sans-serif; 
              font-size: 13px; 
              color: #000;
              width: 270px; 
              margin: 0 auto;
              padding: 0;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .left { text-align: left; }
            
            .dashed { border-bottom: 1px dashed #000; margin: 5px 0; }
            
            .shop-name { font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
            .address { font-size: 12px; margin-bottom: 2px; }
            
            .meta-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-bottom: 2px;}
            
            .tbl-header { display: flex; font-weight: bold; font-size: 13px; margin-bottom: 5px; text-transform: capitalize; }
            
            .row { display: flex; font-size: 13px; margin-bottom: 3px; font-weight: 500; align-items: flex-start; }
            
            /* 🔴 ITEM NAME FIX: Allows wrapping to next line */
            .col-item { width: 48%; text-align: left; word-wrap: break-word; overflow-wrap: break-word; }
            
            .col-qty  { width: 12%; text-align: center; }
            .col-rate { width: 18%; text-align: right; }
            .col-amt  { width: 22%; text-align: right; }
            
            .total-section { margin-top: 5px; }
            .total-row { display: flex; justify-content: space-between; align-items: center; }
            .total-label { font-size: 16px; font-weight: bold; }
            .total-amount { font-size: 26px; font-weight: bold; }
            
            .footer-text { font-size: 12px; margin-top: 10px; }
            .delivery-box { margin-top: 10px; text-align: left; font-size: 13px; font-weight: bold; }
            .qr-container { margin-top: 15px; text-align: center; margin-bottom: 40px;}
            img { display: block; margin: 0 auto; }
          </style>
        </head>
        <body>
          
          <div class="center">
            <div class="shop-name">ARABIAN TREAT HUB</div>
            <div class="address">Odyssey Building, DC Office Road</div>
            <div class="dashed"></div>
            <div style="font-weight: bold;">Cash Memo</div>
            <div class="dashed"></div>
          </div>

          <div class="meta-row"><span>Date : ${dateStr}</span><span>Bill No. : ${billNo}</span></div>
          <div class="meta-row"><span>Time : ${timeStr}</span><span>Type : DELIVERY</span></div>

          <div class="dashed"></div>

          <div class="tbl-header">
            <span class="col-item">Particulars</span>
            <span class="col-qty">Qty</span>
            <span class="col-rate">Rate</span>
            <span class="col-amt">Amount</span>
          </div>

          <div class="dashed"></div>

          ${order.items.map(item => `
            <div class="row">
              <span class="col-item">${item.name}</span>
              <span class="col-qty">${item.qty}</span>
              <span class="col-rate">${item.price}</span>
              <span class="col-amt">${item.price * item.qty}</span>
            </div>
          `).join('')}
          
          ${deliveryFeeHtml}

          <div class="dashed"></div>

          <div class="total-section">
            <div class="total-row"><span class="total-label">Total Rs :</span><span class="total-amount">${order.totalBill}</span></div>
          </div>
          
          <div class="dashed"></div>
          
          <div class="delivery-box">
             <div>DELIVER TO: ${order.customerPhone || ""}</div>
             <div style="font-size: 12px; font-weight: normal; margin-top:2px;">
               ${order.deliveryDetails?.area || ""}<br/>
               ${order.deliveryDetails?.address || ""}
             </div>
          </div>

          <div class="center footer-text"><div>Thank You</div><div>Visit Again</div></div>
          <div class="dashed"></div>

          <div class="qr-container"><img src="${qrUrl}" width="100" height="100" /><div style="font-size: 10px; margin-top: 5px; font-weight: bold;">SCAN TO DELIVER</div></div>

        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };

  return (
    <div className="w-full font-sans text-black">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div><div className="bg-[#16a34a] text-white p-2 px-4 rounded-lg shadow-md flex items-center gap-3 w-fit mb-2"><div className="w-3 h-3 bg-white rounded-full animate-pulse"/><span className="font-bold uppercase tracking-widest text-xs">{status}</span></div><h1 className="text-3xl font-[1000] uppercase italic">{activeTab} ({filteredOrders.length})</h1></div>
        <div className="flex bg-slate-100 p-1 rounded-xl">{["Live", "Delivered", "History"].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-lg text-xs font-[1000] uppercase tracking-wider transition-all ${activeTab === tab ? "bg-black text-white shadow-lg" : "text-slate-400 hover:bg-white"}`}>{tab}</button>))}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.length === 0 ? (<div className="col-span-full py-20 text-center border-4 border-dashed border-slate-100 rounded-3xl"><p className="text-slate-400 font-bold uppercase tracking-widest text-lg">No {activeTab} Orders</p></div>) : (
          filteredOrders.map((order) => (
            <div key={order.id} className={`bg-white border-2 rounded-xl p-5 shadow-sm flex flex-col justify-between transition-colors ${order.status === 'History' || order.status === 'Cancelled' ? 'border-slate-100 opacity-60' : 'border-black'}`}>
              <div>
                <div className="flex justify-between items-start border-b pb-2 mb-3 border-slate-100">
                  <span className="text-lg font-[1000]">#{order.billNo || order.id.slice(0, 5)}</span>
                  <span className={`text-xs font-bold uppercase ${order.status === 'Pending' ? 'text-red-600' : order.status === 'Cancelled' ? 'text-red-500 line-through' : 'text-slate-400'}`}>{order.status.replace(/_/g, " ")}</span>
                </div>
                <div className="space-y-2 mb-4">{order.items?.map((item, idx) => (<div key={idx} className="flex justify-between text-sm font-bold border-b border-dashed border-slate-100 pb-1"><span>{item.qty} x {item.name}</span><span>₹{item.price * item.qty}</span></div>))}</div>
                {order.deliveryFee > 0 && <div className="flex justify-between text-xs font-bold text-blue-600 border-b border-slate-100 pb-2 mb-2"><span>Delivery Charge</span><span>+₹{order.deliveryFee}</span></div>}
              </div>
              <div>
                <div className="flex justify-between items-center mb-4 pt-2"><span className="text-xs font-bold text-slate-400 uppercase">Total Bill</span><span className="text-xl font-[1000]">₹{order.totalBill}</span></div>
                {activeTab === "Live" ? (<div className="grid grid-cols-2 gap-2"><button onClick={() => printKOT(order)} className="col-span-1 py-3 border-2 border-black rounded-lg font-black uppercase text-[10px] hover:bg-slate-50 flex justify-center items-center gap-1">🖨️ Bill</button><button onClick={() => cancelOrder(order)} className="col-span-1 py-3 border-2 border-red-100 bg-red-50 text-red-600 rounded-lg font-black uppercase text-[10px] hover:bg-red-100 hover:border-red-200">❌ Cancel</button>{order.status === 'Pending' && <button onClick={() => acceptAndPrint(order)} className="col-span-2 py-3 bg-black text-white rounded-lg font-black uppercase text-xs hover:scale-105 transition-transform">Accept & Print KOT</button>}{(order.status === 'Preparing' || order.status === 'Ready') && <button onClick={() => updateStatus(order.id, "Out_for_Delivery")} className="col-span-2 py-3 bg-[#facc15] text-black border border-black rounded-lg font-black uppercase text-xs hover:scale-105 transition-transform">Dispatch</button>}{order.status === 'Out_for_Delivery' && <div className="col-span-2 py-3 bg-blue-50 text-blue-600 text-center rounded-lg font-bold text-[10px] uppercase border border-blue-200 animate-pulse">Waiting...</div>}</div>) : (<button onClick={() => printKOT(order)} className="w-full py-2 border border-slate-300 rounded bg-white text-[10px] font-bold uppercase hover:bg-slate-100">Reprint Bill</button>)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}