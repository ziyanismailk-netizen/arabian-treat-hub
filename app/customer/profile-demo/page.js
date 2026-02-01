"use client";
import { useEffect, useState } from "react";
import { fetchCustomerProfile } from "@/lib/firestoreRest";
import { getAllCustomers, setActiveCustomer } from "@/lib/customerSession";

export default function CustomerProfileDemo() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState("");
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setCustomers(getAllCustomers());
  }, []);

  const handleSelect = async (phone) => {
    setSelected(phone);
    setProfile(null);
    setError("");
    setActiveCustomer(phone);
    try {
      // Replace with your actual Firestore doc path for the customer
      const docPath = `customers/${phone}`;
      const data = await fetchCustomerProfile(docPath);
      setProfile(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Customer Profile Demo</h1>
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Select Customer:</label>
        <select value={selected} onChange={e => handleSelect(e.target.value)} className="border p-2 rounded">
          <option value="">-- Choose --</option>
          {customers.map(c => (
            <option key={c.phone} value={c.phone}>{c.phone}</option>
          ))}
        </select>
      </div>
      {error && <div className="text-red-600 mb-2">Error: {error}</div>}
      {profile && (
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs">{JSON.stringify(profile, null, 2)}</pre>
      )}
    </div>
  );
}
