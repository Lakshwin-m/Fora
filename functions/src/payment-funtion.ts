import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import cors from "cors";
import crypto from "crypto";

const db = admin.firestore();

/* ============================================================
   RAZORPAY CONFIGURATION - Using Secret Manager
   ============================================================ */

// Define secrets that will be read from Google Cloud Secret Manager
const razorpayKeyId = defineSecret("RAZORPAY_KEY_ID");
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");

/* ============================================================
   CORS CONFIG
   ============================================================ */

const corsHandler = cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

/* ============================================================
   AUTH HELPER
   ============================================================ */

const verifyAuth = async (req: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing token");
  }

  const token = authHeader.substring(7);
  const decodedToken = await admin.auth().verifyIdToken(token);
  return decodedToken;
};

/* ============================================================
   PRICING CONFIGURATION
   ============================================================ */

const PRICING = {
  starter: {
    monthly: 19900,
    yearly: 99900,
  },
  pro: {
    monthly: 39900,
    yearly: 199900,
  },
};

/* ============================================================
   CREATE RAZORPAY ORDER
   ============================================================ */

export const createRazorpayOrder = onRequest(
  {
    cors: true,
    invoker: "public",
    secrets: [razorpayKeyId, razorpayKeySecret], // ← CRITICAL: Tell function to access secrets
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method === "OPTIONS") {
          res.status(204).send("");
          return;
        }

        // Get the actual key values from Secret Manager and trim accidental spaces
        const RAZORPAY_KEY_ID = razorpayKeyId.value()?.trim();
        const RAZORPAY_KEY_SECRET = razorpayKeySecret.value()?.trim();

                        
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
          console.error("❌ Razorpay keys not configured!");
          res.status(500).json({
            error: "Payment system not configured. Secrets not accessible.",
          });
          return;
        }

        const user = await verifyAuth(req);
        const { planTier, billingCycle } = req.body;

        
        if (!planTier || !billingCycle) {
          res.status(400).json({ error: "Missing planTier or billingCycle" });
          return;
        }

        if (!["starter", "pro"].includes(planTier)) {
          res.status(400).json({ error: "Invalid planTier" });
          return;
        }

        if (!["monthly", "yearly"].includes(billingCycle)) {
          res.status(400).json({ error: "Invalid billingCycle" });
          return;
        }

        let amount: number;
        const configSnap = await db.collection("config").doc("pricing").get();

        if (configSnap.exists) {
          const pricing = configSnap.data();
          amount = pricing?.[planTier]?.[billingCycle];
        } else {
          amount =
            PRICING[planTier as keyof typeof PRICING][
              billingCycle as keyof typeof PRICING.starter
            ];
        }

        if (!amount) {
          res.status(400).json({ error: "Invalid pricing configuration" });
          return;
        }

        
        const orderData = {
          amount,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
          notes: {
            userId: user.uid,
            planTier,
            billingCycle,
          },
        };

        const razorpayResponse = await fetch(
          "https://api.razorpay.com/v1/orders",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Basic " +
                Buffer.from(
                  `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
                ).toString("base64"),
            },
            body: JSON.stringify(orderData),
          }
        );

        if (!razorpayResponse.ok) {
          const errorData = await razorpayResponse.json();
          console.error("Razorpay order creation failed:", errorData);
          res.status(500).json({
            error:
              "Failed to create Razorpay order: " +
              errorData.error?.description,
          });
          return;
        }

        const order = await razorpayResponse.json();
        
        await db.collection("payments").add({
          userId: user.uid,
          orderId: order.id,
          planTier,
          billingCycle,
          amount,
          currency: "INR",
          status: "pending",
          razorpayOrderId: order.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        });
      } catch (e: any) {
        console.error("createRazorpayOrder error:", e);
        res.status(500).json({ error: e.message });
      }
    });
  }
);

/* ============================================================
   VERIFY RAZORPAY PAYMENT
   ============================================================ */

export const verifyRazorpayPayment = onRequest(
  {
    cors: true,
    invoker: "public",
    secrets: [razorpayKeyId, razorpayKeySecret], // ← CRITICAL
  },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method === "OPTIONS") {
          res.status(204).send("");
          return;
        }

        const RAZORPAY_KEY_ID = razorpayKeyId.value()?.trim();
        const RAZORPAY_KEY_SECRET = razorpayKeySecret.value()?.trim();

        const user = await verifyAuth(req);
        const {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          planTier,
          billingCycle,
        } = req.body;

        
        if (
          !razorpay_order_id ||
          !razorpay_payment_id ||
          !razorpay_signature ||
          !planTier ||
          !billingCycle
        ) {
          res.status(400).json({ error: "Missing required payment details" });
          return;
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac("sha256", RAZORPAY_KEY_SECRET)
          .update(body)
          .digest("hex");

        if (expectedSignature !== razorpay_signature) {
          console.error("Invalid signature");
          res.status(400).json({ error: "Invalid payment signature" });
          return;
        }

        
        const paymentDetailsResponse = await fetch(
          `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
          {
            method: "GET",
            headers: {
              Authorization:
                "Basic " +
                Buffer.from(
                  `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
                ).toString("base64"),
            },
          }
        );

        if (!paymentDetailsResponse.ok) {
          console.error("Failed to fetch payment details from Razorpay");
          res.status(500).json({ error: "Failed to fetch payment details" });
          return;
        }

        const paymentDetails = await paymentDetailsResponse.json();
        
        const now = admin.firestore.Timestamp.now();
        const startDate = now.toDate();
        const nextDueDate = new Date(startDate);

        if (billingCycle === "monthly") {
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        } else {
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        }

        await db.runTransaction(async (transaction) => {
          const subscriptionRef = db.collection("subscriptions").doc(user.uid);

          const planUpdate: any = {
            tier: planTier,
            billingCycle,
            subscriptionStartDate: now,
            subscriptionEndDate:
              admin.firestore.Timestamp.fromDate(nextDueDate),
            capsuleLimit: planTier === "starter" ? 50 : null,
            usedCapsules: 0,
            resetInterval: planTier === "starter" ? "monthly" : null,
            lastResetAt: now,
            status: "active",
          };

          // Save the subscription strictly in subscriptions collection
          transaction.set(subscriptionRef, planUpdate, { merge: true });

          // Also remove it from user document if it existed safely
          const userRef = db.collection("users").doc(user.uid);
          transaction.set(userRef, {
            plan: admin.firestore.FieldValue.delete()
          }, { merge: true });

          
          const paymentsSnap = await db
            .collection("payments")
            .where("orderId", "==", razorpay_order_id)
            .where("userId", "==", user.uid)
            .limit(1)
            .get();

          if (!paymentsSnap.empty) {
            const paymentDoc = paymentsSnap.docs[0];
            transaction.update(paymentDoc.ref, {
              status: "completed",
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
              completedAt: now,
              paymentMethod: paymentDetails.method,
              email: paymentDetails.email,
              contact: paymentDetails.contact,
              subscriptionStartDate: now,
              subscriptionEndDate:
                admin.firestore.Timestamp.fromDate(nextDueDate),
              nextDueDate: admin.firestore.Timestamp.fromDate(nextDueDate),
            });
          } else {
            const newPaymentRef = db.collection("payments").doc();
            transaction.set(newPaymentRef, {
              userId: user.uid,
              orderId: razorpay_order_id,
              razorpayPaymentId: razorpay_payment_id,
              razorpaySignature: razorpay_signature,
              planTier,
              billingCycle,
              amount: paymentDetails.amount,
              currency: paymentDetails.currency,
              status: "completed",
              paymentMethod: paymentDetails.method,
              email: paymentDetails.email,
              contact: paymentDetails.contact,
              createdAt: now,
              completedAt: now,
              subscriptionStartDate: now,
              subscriptionEndDate:
                admin.firestore.Timestamp.fromDate(nextDueDate),
              nextDueDate: admin.firestore.Timestamp.fromDate(nextDueDate),
            });
          }

                  });

        res.json({
          success: true,
          message: "Payment verified and plan upgraded successfully",
        });
      } catch (e: any) {
        console.error("verifyRazorpayPayment error:", e);
        res.status(500).json({ error: e.message });
      }
    });
  }
);

/* ============================================================
   OTHER FUNCTIONS
   ============================================================ */

export const getPaymentHistory = onRequest(
  { cors: true, invoker: "public" },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method === "OPTIONS") {
          res.status(204).send("");
          return;
        }

        const user = await verifyAuth(req);

        const paymentsSnap = await db
          .collection("payments")
          .where("userId", "==", user.uid)
          .orderBy("createdAt", "desc")
          .get();

        const payments = paymentsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        res.json(payments);
      } catch (e: any) {
        console.error("getPaymentHistory error:", e);
        res.status(401).json({ error: e.message });
      }
    });
  }
);

export const cancelSubscription = onRequest(
  { cors: true, invoker: "public" },
  (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method === "OPTIONS") {
          res.status(204).send("");
          return;
        }

        const user = await verifyAuth(req);

        const subRef = db.collection("subscriptions").doc(user.uid);
        const subSnap = await subRef.get();

        if (!subSnap.exists) {
          res.status(404).json({ error: "No active subscription found" });
          return;
        }

        const currentPlan = subSnap.data();

        if (!currentPlan || currentPlan.tier === "free") {
          res.status(400).json({ error: "No active subscription to cancel" });
          return;
        }

        await subRef.update({
          status: "cancelled",
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          willDowngradeAt: currentPlan.subscriptionEndDate,
        });

        await db.collection("payments").add({
          userId: user.uid,
          type: "cancellation",
          planTier: currentPlan.tier,
          status: "completed",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          note: "User cancelled subscription",
        });

        res.json({
          success: true,
          message:
            "Subscription cancelled. Access will continue until end date.",
        });
      } catch (e: any) {
        console.error("cancelSubscription error:", e);
        res.status(500).json({ error: e.message });
      }
    });
  }
);

export const checkExpiredSubscriptions = onSchedule(
  "every 24 hours",
  async () => {
    try {
      const now = admin.firestore.Timestamp.now();

      const subsSnap = await db
        .collection("subscriptions")
        .where("subscriptionEndDate", "<=", now)
        .where("status", "in", ["active", "cancelled"])
        .get();

      if (subsSnap.empty) {
                return;
      }

      const batch = db.batch();

      subsSnap.forEach((doc) => {
        const plan = doc.data();

        batch.update(doc.ref, {
          tier: "free",
          capsuleLimit: 5,
          usedCapsules: plan.usedCapsules || 0,
          status: "expired",
          previousTier: plan.tier,
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          resetInterval: null,
          lastResetAt: null,
        });
      });

      await batch.commit();
          } catch (error) {
      console.error("checkExpiredSubscriptions error:", error);
    }
  }
);

export const razorpayWebhook = onRequest({ invoker: "public" }, (req, res) => {
  try {
    const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
    const webhookSignature = req.headers["x-razorpay-signature"] as string;

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (webhookSignature !== expectedSignature) {
      res.status(400).send("Invalid signature");
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload;

    switch (event) {
      case "payment.captured":
                break;
      case "payment.failed":
                break;
      case "order.paid":
                break;
      default:
            }

    res.status(200).send("Webhook received");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Webhook processing failed");
  }
});
