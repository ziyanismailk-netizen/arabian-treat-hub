// MSG91 OTP Integration - Direct API with Capacitor HTTP
const MSG91_AUTH_KEY = "492883Axt9LfZLQo146986d1dbP1";

// Make HTTP request using Capacitor native HTTP (bypasses CORS)
const makeRequest = async (url, method = 'GET') => {
  // Dynamically import Capacitor to avoid SSR issues
  try {
    const { CapacitorHttp } = await import('@capacitor/core');
    const { Capacitor } = await import('@capacitor/core');
    
    if (Capacitor.isNativePlatform()) {
      console.log("Using Capacitor native HTTP for:", url);
      const response = await CapacitorHttp.request({
        url,
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log("Native HTTP response:", response);
      return response.data;
    }
  } catch (e) {
    console.log("Capacitor not available, using fetch:", e.message);
  }
  
  // Fallback to fetch
  const response = await fetch(url);
  return response.json();
};

// Initialize (no-op for this implementation)
export function initializeOTP() {
  console.log("MSG91 OTP initialized");
}

// Get configuration
export function getWidgetConfig() {
  return { authKey: MSG91_AUTH_KEY };
}

// Send OTP
export const sendOTP = async (phone) => {
  const mobileNumber = phone.replace('+91', '').replace(/\D/g, '');
  
  if (mobileNumber.length !== 10) {
    throw new Error("Invalid phone number");
  }
  
  try {
    const url = `https://api.msg91.com/api/v5/otp?authkey=${MSG91_AUTH_KEY}&mobile=91${mobileNumber}`;
    const data = await makeRequest(url);
    
    console.log("MSG91 Send Response:", data);
    
    if (data.type === 'success' && data.request_id) {
      if (typeof window !== 'undefined') {
        window.__msg91_reqId = data.request_id;
        window.__msg91_phone = mobileNumber;
      }
      return { success: true, message: "OTP sent successfully", reqId: data.request_id };
    } else {
      throw new Error(data.message || "Failed to send OTP");
    }
  } catch (error) {
    console.error("Send OTP Error:", error);
    throw error;
  }
};

// Verify OTP
export const verifyOTP = async (phone, otp) => {
  const mobileNumber = phone.replace('+91', '').replace(/\D/g, '');
  
  if (mobileNumber.length !== 10) {
    throw new Error("Invalid phone number");
  }
  
  if (otp.length !== 6) {
    throw new Error("Invalid OTP");
  }
  
  try {
    const url = `https://api.msg91.com/api/v5/otp/verify?authkey=${MSG91_AUTH_KEY}&mobile=91${mobileNumber}&otp=${otp}`;
    const data = await makeRequest(url);
    
    console.log("MSG91 Verify Response:", data);
    
    if (data.type === 'success') {
      return { success: true, message: "OTP verified successfully" };
    } else {
      throw new Error(data.message || "Invalid OTP");
    }
  } catch (error) {
    console.error("Verify OTP Error:", error);
    throw error;
  }
};

// Resend OTP
export const resendOTP = async (phone) => {
  const mobileNumber = phone.replace('+91', '').replace(/\D/g, '');
  
  if (mobileNumber.length !== 10) {
    throw new Error("Invalid phone number");
  }
  
  try {
    const url = `https://api.msg91.com/api/v5/otp/retry?authkey=${MSG91_AUTH_KEY}&mobile=91${mobileNumber}&retrytype=text`;
    const data = await makeRequest(url);
    
    console.log("MSG91 Resend Response:", data);
    
    if (data.type === 'success') {
      return { success: true, message: "OTP resent successfully" };
    } else {
      throw new Error(data.message || "Failed to resend OTP");
    }
  } catch (error) {
    console.error("Resend OTP Error:", error);
    throw error;
  }
};

// Verify Access Token (for widget flow)
export const verifyAccessToken = async (accessToken) => {
  try {
    const response = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        authkey: MSG91_AUTH_KEY,
        'access-token': accessToken
      })
    });
    
    const data = await response.json();
    console.log("MSG91 Token Verification Response:", data);
    
    if (data.type === 'success') {
      return { success: true, message: "Token verified", phone: data.message };
    } else {
      return { success: false, message: data.message || "Token verification failed" };
    }
  } catch (error) {
    console.error("Token Verification Error:", error);
    return { success: false, message: error.message };
  }
};