import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { startPayment } from "@/lib/razorpay";
import { useAuth } from "@/hooks/useAuth";

interface InvoiceState {
  planTier: "starter" | "pro";
  billingCycle: "monthly" | "yearly";
  amount: number;
  planName: string;
}

export default function InvoicePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const state = location.state as InvoiceState;

  if (!state) {
    navigate("/pricing");
    return null;
  }

  const { planTier, billingCycle, amount, planName } = state;

  // Calculate prices
  const subtotal = amount / 100;
  const gst = subtotal * 0.18; // 18% GST
  const total = subtotal + gst;

  // Get current date
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;

  const handlePayNow = async () => {
    setIsProcessing(true);
    try {
      await startPayment({ planTier, billingCycle });
    } catch (error) {
      console.error("Payment failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
            Invoice
          </h1>
          <p className="text-slate-600">Please review your order details</p>
        </motion.div>

        {/* Invoice Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Invoice Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black mb-1">Forá</h2>
                <p className="text-slate-300 text-sm">Time Capsule Service</p>
              </div>
              <div className="text-right">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
                  <p className="text-xs uppercase tracking-wider text-slate-300">
                    Invoice Number
                  </p>
                  <p className="text-lg font-bold">{invoiceNumber}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="p-8">
            {/* Bill To */}
            <div className="mb-8">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                Bill To
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="font-semibold text-slate-900">{user?.email}</p>
                <p className="text-sm text-slate-600 mt-1">
                  Invoice Date: {currentDate}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 my-8"></div>

            {/* Items Table */}
            <div className="mb-8">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4">
                Order Details
              </h3>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="bg-slate-50 grid grid-cols-12 gap-4 p-4 text-sm font-semibold text-slate-700 border-b border-slate-200">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-3 text-center">Duration</div>
                  <div className="col-span-3 text-right">Amount</div>
                </div>

                {/* Table Row */}
                <div className="grid grid-cols-12 gap-4 p-4 items-center">
                  <div className="col-span-6">
                    <div>
                      <p className="font-bold text-slate-900 text-lg">
                        {planName}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {planTier === "starter"
                          ? "50 capsules per month"
                          : "Unlimited capsules"}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-semibold">
                          {billingCycle === "monthly"
                            ? "Monthly"
                            : "Yearly"}
                        </span>
                        {billingCycle === "yearly" && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-semibold">
                            Save 58%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3 text-center">
                    <p className="font-semibold text-slate-900">
                      {billingCycle === "monthly" ? "1 Month" : "1 Year"}
                    </p>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="font-bold text-slate-900 text-lg">
                      ₹{subtotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
              <div className="space-y-3">
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>GST (18%)</span>
                  <span className="font-semibold">₹{gst.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-900">
                      Total Amount
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Included */}
            <div className="mt-8">
              <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4">
                What's Included
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Secure encryption",
                  "Priority support",
                  "Custom categories",
                  "Advanced features",
                ].map((feature, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-slate-50 p-8 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/pricing")}
                className="flex-1 py-3 px-6 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
              >
                Back to Pricing
              </button>
              <motion.button
                onClick={handlePayNow}
                disabled={isProcessing}
                className="flex-1 py-3 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                whileTap={{ scale: isProcessing ? 1 : 0.98 }}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Pay Now - ₹{total.toFixed(2)}
                  </span>
                )}
              </motion.button>
            </div>

            {/* Security Note */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Secure payment powered by Razorpay</span>
            </div>
          </div>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 text-sm text-slate-600"
        >
          <p>Questions about billing? Contact us at support@fora.com</p>
        </motion.div>
      </div>
    </div>
  );
}