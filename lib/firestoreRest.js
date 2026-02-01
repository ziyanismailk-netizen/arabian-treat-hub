// Firestore REST API call using the active customer token
import { getActiveCustomerToken } from "@/lib/customerSession";

// Example: Get a document from Firestore as the active customer
export async function fetchCustomerProfile(docPath) {
  const token = getActiveCustomerToken();
  if (!token) throw new Error("No active customer token");

  // docPath example: "customers/USER_ID"
  const url = `https://firestore.googleapis.com/v1/projects/arabian-treat-hub/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Firestore fetch failed: " + res.status);
  return await res.json();
}

// Example usage:
// const profile = await fetchCustomerProfile("customers/USER_ID");
