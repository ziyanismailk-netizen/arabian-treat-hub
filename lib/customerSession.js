// Utility for managing multiple customer sessions in localStorage

// Get all logged-in customers
export function getAllCustomers() {
  const list = JSON.parse(localStorage.getItem("ath_customer_list") || "[]");
  return list.map(phone => {
    const data = localStorage.getItem(`ath_customer_token_${phone}`);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      return { phone, ...parsed };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

// Set the active customer (for Firestore requests)
export function setActiveCustomer(phone) {
  localStorage.setItem("ath_active_customer", phone);
}

// Get the active customer's token
export function getActiveCustomerToken() {
  const phone = localStorage.getItem("ath_active_customer");
  if (!phone) return null;
  const data = localStorage.getItem(`ath_customer_token_${phone}`);
  if (!data) return null;
  try {
    return JSON.parse(data).token;
  } catch {
    return null;
  }
}
