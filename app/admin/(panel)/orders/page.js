"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, deleteDoc } from "firebase/firestore";

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

  const bulkWipeAllOrders = async () => {
    if (!confirm(`🗑️ DELETE ALL ${orders.length} ORDERS? This cannot be undone!`)) return;
    try {
      const snapshot = await getDocs(collection(db, "orders"));
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, "orders", d.id)));
      await Promise.all(deletePromises);
      alert("✅ All orders deleted!");
    } catch (error) {
      alert("Error: " + error.message);
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
    <div className="w-full font-sans text-black min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 pb-10">
      {/* Sticky Tab Bar & Status */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-emerald-50 via-white to-emerald-100 pt-6 pb-2 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-6xl mx-auto px-2">
          <div>
            <div className="bg-[#16a34a] text-white p-2 px-4 rounded-lg shadow-md flex items-center gap-3 w-fit mb-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"/>
              <span className="font-bold uppercase tracking-widest text-xs">{status}</span>
            </div>
            <h1 className="text-3xl font-extrabold uppercase italic tracking-tight text-emerald-950">{activeTab} <span className="text-emerald-400">({filteredOrders.length})</span></h1>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <div className="flex bg-emerald-100 p-1 rounded-2xl shadow-inner border border-emerald-200">
              {["Live", "Delivered", "History"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-7 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-150 mx-1 shadow-sm ${
                    activeTab === tab
                      ? "bg-emerald-900 text-white scale-105 shadow-lg border border-emerald-700"
                      : "text-emerald-700 hover:bg-white hover:text-emerald-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {orders.length > 0 && (
              <button
                onClick={bulkWipeAllOrders}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-lg shadow-lg transition-all"
              >
                🗑️ WIPE ALL ORDERS
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-5xl mx-auto px-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-emerald-100 rounded-2xl bg-white/80">
            <p className="text-emerald-300 font-extrabold uppercase tracking-widest text-lg">No {activeTab} Orders</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className={`bg-white border-2 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all duration-200 hover:scale-[1.01] ${
                order.status === 'History' || order.status === 'Cancelled'
                  ? 'border-emerald-100 opacity-60'
                  : 'border-emerald-900'
              }`}
            >
              <div>
                <div className="flex justify-between items-start border-b pb-2 mb-3 border-emerald-100">
                  <span className="text-xl font-extrabold text-emerald-900">#{order.billNo || order.id.slice(0, 5)}</span>
                  <span className={`text-xs font-bold uppercase ${
                    order.status === 'Pending'
                      ? 'text-red-600'
                      : order.status === 'Cancelled'
                      ? 'text-red-500 line-through'
                      : 'text-emerald-700'
                  }`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  {order.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col border-b border-dashed border-emerald-100 pb-1"
                    >
                      <div className="flex justify-between text-sm font-bold">
                        <span>{item.qty} x {item.name}</span>
                        <span>₹{item.price * item.qty}</span>
                      </div>
                      {item.info && (
                        <div className="text-[11px] text-emerald-700 font-normal mt-1">{item.info}</div>
                      )}
                    </div>
                  ))}
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-xs font-bold text-blue-600 border-b border-emerald-100 pb-2 mb-2">
                    <span>Delivery Charge</span>
                    <span>+₹{order.deliveryFee}</span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-4 pt-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase">Total Bill</span>
                  <span className="text-2xl font-extrabold text-emerald-900">₹{order.totalBill}</span>
                </div>
                {activeTab === 'Live' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => printKOT(order)}
                      className="col-span-1 py-3 border-2 border-emerald-900 rounded-xl font-extrabold uppercase text-xs hover:bg-emerald-50 flex justify-center items-center gap-1 transition-all"
                    >
                      🖨️ Bill
                    </button>
                    <button
                      onClick={() => cancelOrder(order)}
                      className="col-span-1 py-3 border-2 border-red-200 bg-red-50 text-red-600 rounded-xl font-extrabold uppercase text-xs hover:bg-red-100 hover:border-red-300 transition-all"
                    >
                      ❌ Cancel
                    </button>
                    {order.status === 'Pending' && (
                      <button
                        onClick={() => acceptAndPrint(order)}
                        className="col-span-2 py-3 bg-emerald-900 text-white rounded-xl font-extrabold uppercase text-xs hover:scale-105 transition-transform mt-1"
                      >
                        Accept & Print KOT
                      </button>
                    )}
                    {(order.status === 'Preparing' || order.status === 'Ready') && (
                      <button
                        onClick={() => updateStatus(order.id, 'Out_for_Delivery')}
                        className="col-span-2 py-3 bg-yellow-300 text-black border border-emerald-900 rounded-xl font-extrabold uppercase text-xs hover:scale-105 transition-transform mt-1"
                      >
                        Dispatch
                      </button>
                    )}
                    {order.status === 'Out_for_Delivery' && (
                      <div className="col-span-2 py-3 bg-blue-50 text-blue-600 text-center rounded-xl font-bold text-xs border border-blue-200 animate-pulse mt-1">
                        Waiting...
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => printKOT(order)}
                    className="w-full py-2 border border-emerald-200 rounded bg-white text-xs font-bold uppercase hover:bg-emerald-50 transition-all"
                  >
                    Reprint Bill
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}