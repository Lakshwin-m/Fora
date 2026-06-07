import { auth } from "@/firebase";

// Get the Cloud Functions base URL
const FUNCTIONS_BASE_URL =
  import.meta.env.VITE_FUNCTIONS_URL ||
  "https://us-central1-localhost-b5ee6.cloudfunctions.net";

export async function startPayment({
  planTier,
  billingCycle,
}: {
  planTier: "starter" | "pro";
  billingCycle: "monthly" | "yearly";
}) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Please log in first");
    }

    // Show loading indicator (you can integrate with your UI state)
    console.log("Initiating payment...");

    // Get fresh ID token
    const token = await user.getIdToken();

    // 1️⃣ Create Razorpay order
    const createResponse = await fetch(
      `${FUNCTIONS_BASE_URL}/createRazorpayOrder`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planTier, billingCycle }),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error || "Failed to create order");
    }

    const orderData = await createResponse.json();

    // 2️⃣ Prepare Razorpay checkout options
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID?.trim(), // PUBLIC KEY ONLY
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: "Forá",
      description: `${
        planTier.charAt(0).toUpperCase() + planTier.slice(1)
      } Plan - ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`,
      order_id: orderData.orderId,

      // Success handler
      handler: async (response: any) => {
        try {
          console.log("Payment successful, verifying...");

          // Get fresh token for verification
          const verifyToken = await user.getIdToken();

          // 3️⃣ Verify payment on backend
          const verifyResponse = await fetch(
            `${FUNCTIONS_BASE_URL}/verifyRazorpayPayment`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${verifyToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planTier,
                billingCycle,
              }),
            }
          );

          if (!verifyResponse.ok) {
            const error = await verifyResponse.json();
            throw new Error(error.error || "Payment verification failed");
          }

          const result = await verifyResponse.json();

          // 4️⃣ Success - Redirect or show success message
          console.log("Payment verified successfully!", result);

          // Show success message
          alert("🎉 Payment successful! Your plan has been upgraded.");

          // Redirect to dashboard or reload page
          window.location.href = "/dashboard"; // or window.location.reload();
        } catch (err: any) {
          console.error("Payment verification failed:", err);

          // More detailed error for user
          alert(
            `⚠️ Payment was processed but verification failed.\n\n` +
              `Error: ${err.message}\n\n` +
              `Don't worry - we've received your payment. ` +
              `If your plan isn't upgraded, please contact support with payment ID: ${response.razorpay_payment_id}`
          );
        }
      },

      // Payment modal configuration
      modal: {
        ondismiss: () => {
          console.log("Payment popup closed by user");
          // Optional: Track analytics event
        },
        escape: true,
        backdropclose: false,
      },

      // Prefill user information (optional but recommended)
      prefill: {
        name: user.displayName || "Forá User",
        email: user.email || "test@example.com",
        contact: user.phoneNumber || "9999999999",
      },

      // Theme customization
      theme: {
        color: "#000000", // Your brand color
        backdrop_color: "rgba(0, 0, 0, 0.5)",
      },

      // Notes (these will be passed to Razorpay)
      notes: {
        user_id: user.uid,
        plan_tier: planTier,
        billing_cycle: billingCycle,
      },
    };

    // 3️⃣ Open Razorpay checkout modal
    const razorpay = new (window as any).Razorpay(options);

    // Handle payment failure
    razorpay.on("payment.failed", function (response: any) {
      console.error("Payment failed:", response.error);

      const isTestMode = options.key.startsWith("rzp_test_");
      const testModeTip = isTestMode ? "\n\n💡 Note: Since Razorpay is in Test Mode, real cards will fail. Please use Razorpay test cards." : "";

      alert(
        `❌ Payment Failed\n\n` +
          `Reason: ${response.error.description}\n` +
          `Code: ${response.error.code}${testModeTip}\n\n` +
          `Please try again or contact support if the issue persists.`
      );
    });

    razorpay.open();
  } catch (err: any) {
    console.error("Payment initiation failed:", err);

    // User-friendly error messages
    let errorMessage = "Unable to start payment. Please try again.";

    if (err.message.includes("log in")) {
      errorMessage = "Please log in to upgrade your plan.";
      // Redirect to login
      window.location.href = "/login";
      return;
    } else if (
      err.message.includes("network") ||
      err.message.includes("fetch")
    ) {
      errorMessage =
        "Network error. Please check your connection and try again.";
    } else if (err.message) {
      errorMessage = err.message;
    }

    alert(`⚠️ ${errorMessage}`);
  }
}

/**
 * Fetch user's payment history
 */
export async function getPaymentHistory() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    const token = await user.getIdToken();

    const response = await fetch(`${FUNCTIONS_BASE_URL}/getPaymentHistory`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch payment history");
    }

    return await response.json();
  } catch (err) {
    console.error("Failed to fetch payment history:", err);
    throw err;
  }
}

/**
 * Cancel active subscription
 */
export async function cancelSubscription() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    if (!confirm("Are you sure you want to cancel your subscription?")) {
      return { cancelled: false };
    }

    const token = await user.getIdToken();

    const response = await fetch(`${FUNCTIONS_BASE_URL}/cancelSubscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to cancel subscription");
    }

    const result = await response.json();

    alert(
      "✅ Subscription cancelled successfully.\n\n" +
        "You'll retain access to your plan until the end of your billing period."
    );

    return result;
  } catch (err: any) {
    console.error("Failed to cancel subscription:", err);
    alert(`❌ Failed to cancel subscription: ${err.message}`);
    throw err;
  }
}

/**
 * Type definitions for TypeScript
 */
export interface PaymentRecord {
  id: string;
  userId: string;
  orderId: string;
  razorpayPaymentId?: string;
  planTier: "starter" | "pro";
  billingCycle: "monthly" | "yearly";
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  createdAt: any; // Firestore Timestamp
  completedAt?: any;
  nextDueDate?: any;
}
