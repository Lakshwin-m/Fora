# Forá Backend Architecture

Forá's backend is built entirely on **Firebase** using **Cloud Functions (v2)**, **Firestore**, and **Firebase Authentication**. It implements a robust, secure architecture that handles End-to-End Encryption (E2EE), automated background tasks, payments via Razorpay, and a complete social graph.

## Architecture Overview

The backend uses a mix of:
1. **HTTP Endpoints (`onRequest`)**: Act as traditional REST API routes with built-in CORS configuration, handling authenticated requests from the Vite/React frontend.
2. **Callable Functions (`onCall`)**: Called directly via the Firebase Client SDK, automatically injecting authentication context.
3. **Scheduled Functions (`onSchedule`)**: Cron jobs that run automatically (e.g., unlocking capsules, expiring subscriptions).
4. **Firestore Triggers (`onDocumentCreated`)**: Event-driven functions that react to database changes in real-time.

---

## 🔐 1. Auth, Security, & Encryption

Forá uses an End-to-End Encryption (E2EE) approach to ensure that capsules are only readable by their intended recipients.

### `getKeyMaterial` (Callable)
- **How it works:** Returns a secret server-side "pepper" combined with the user's `uid`. It uses Google Cloud Secret Manager (`FORA_PEPPER`).
- **Frontend Usage:** The frontend calls this function during authentication. It takes the returned material and uses PBKDF2 on the client side to derive a local Master Key. This key is used to encrypt/decrypt capsule symmetric keys before they are sent to the database. This guarantees the server never sees the raw decryption keys.

### `getServerTime` (HTTP)
- **How it works:** Simply returns the current ISO string and timestamp of the server.
- **Frontend Usage:** Used by the client to synchronize timers (like the Capsule Countdown timer) perfectly, ensuring local device clock discrepancies don't affect unlock times.

### `getMyProfile` (HTTP)
- **How it works:** Verifies the user's Bearer token, fetches their `users` document, and joins it with their `subscriptions` document. It calculates their capsule limits (e.g., Starter = 50, Pro = Unlimited, Free = 5).
- **Frontend Usage:** Fetched on app load to populate the user context, determine if they hit a paywall, and display their current plan tier.

---

## 🏺 2. Capsule Lifecycle Management

The core of Forá. Handles the creation, retrieval, and deletion of time capsules.

### `createCapsule` (HTTP)
- **How it works:** 
  1. Checks the user's `subscriptions` document using a Firestore Transaction to ensure they haven't exceeded their plan's `capsuleLimit`.
  2. Creates the `capsules` document with **encrypted data** (`encryptedTitle`, `encryptedContent`, IVs, and `encryptedKeys`).
  3. Increments the `usedCapsules` counter in the user's subscription record.
- **Frontend Usage:** Called when the user completes the Capsule Creation stepper. The frontend first encrypts the rich text and files, then passes the ciphertexts to this endpoint.

### `getMyCapsules` & `getReceivedCapsules` (HTTP)
- **How it works:** Queries the `capsules` collection where `userId == uid` (created by me) or where `recipients` array contains the `uid` (shared with me).
- **Frontend Usage:** Populates the Dashboard tabs ("My Capsules" and "Received").

### `openCapsule` (HTTP)
- **How it works:** Verifies ownership or recipient access, then updates the capsule status to `opened`.
- **Frontend Usage:** Fired when a user successfully unlocks and views an unlocked capsule for the first time.

### `deleteCapsule` (HTTP)
- **How it works:** A comprehensive cleanup function. It deletes the capsule document, deletes the metadata in `scheduledUnlocks`, aggressively deletes all associated media directly from Firebase Storage (`capsules/{capsuleId}/`), and decrements the user's `usedCapsules` count.
- **Frontend Usage:** Attached to the "Delete" button in the capsule detail view.

---

## ⏳ 3. The Unlock Engine

Capsules are unlocked precisely when their target time is reached.

### `checkAndUnlockCapsules` (Scheduled - Every 1 Minute)
- **How it works:** A chron job that queries all capsules where `isUnlocked == false`, `status == scheduled`, and `unlockDate <= now`. It runs a batch update to set them to `isUnlocked: true`.
- **Frontend Usage:** Requires no frontend interaction. It silently unlocks capsules globally in the background.

### `checkCapsuleUnlockStatus` (Callable)
- **How it works:** Acts as a manual override/sync. If the frontend realizes a capsule should be unlocked but the cron job hasn't hit yet, it calls this function to force an immediate batch check and unlock for the specific user's capsules.
- **Frontend Usage:** Polled or triggered when a capsule's countdown hits zero on the frontend to instantly reveal it without waiting for the next minute boundary.

### `scheduleCapsuleUnlock` (Firestore Trigger)
- **How it works:** Fires whenever a new capsule is created (`capsules/{capsuleId}`). It clones the timing metadata into a separate `scheduledUnlocks` collection.
- **Frontend Usage:** Background process; sets up secondary indices/queues for reliable unlocking.

### `unlockDueCapsules` (HTTP - Admin)
- **How it works:** A manual debug endpoint to force unlock due capsules.

---

## 👥 4. Social Graph (Friends System)

Manages connections between users to allow sharing capsules.

### `sendFriendRequest` (HTTP)
- **How it works:** Creates a document in the `friends` collection with an ID derived from both UIDs (`uidA_uidB`), status set to `pending`.
- **Frontend Usage:** Used in the "Add Friend" modal.

### `getPendingRequests` & `getFriends` (HTTP)
- **How it works:** Queries the `friends` collection for pending incoming requests or accepted friendships, performing a join with the `users` collection to return rich profile data.
- **Frontend Usage:** Populates the "Connections" and "Pending Requests" UI.

### `acceptFriendRequest` & `rejectFriendRequest` & `removeFriend` (HTTP)
- **How it works:** Updates the status of the friendship document to `accepted` or `rejected`, or completely deletes it.
- **Frontend Usage:** Actions in the Connections UI.

### `searchUsers` (HTTP)
- **How it works:** Performs a prefix search on the `users` collection by email.
- **Frontend Usage:** Powers the user search input when looking for people to add.

---

## 🔔 5. Notifications

### `notifyFriendRequest` (Firestore Trigger)
- **How it works:** Listens for document creations in the `friends` collection. If a request is `pending`, it inserts a new document into the `notifications` collection for the receiver.
- **Frontend Usage:** The frontend listens to the `notifications` collection (via snapshot listener) to show red dot indicators on the bell icon.

### `getNotifications` (HTTP)
- **How it works:** Retrieves the latest 20 notifications for the user.
- **Frontend Usage:** Populates the notification dropdown.

---

## 💳 6. Payments & Subscriptions (Razorpay)

Located in `payment-funtion.ts`, handles SaaS monetization safely.

### `createRazorpayOrder` (HTTP)
- **How it works:** Reads the current pricing config, calculates the amount, and calls the Razorpay API to generate a secure `orderId`. Records a `pending` payment in Firestore.
- **Frontend Usage:** When a user clicks "Upgrade", the frontend calls this to get an Order ID, which is then passed to the Razorpay Checkout script (`window.Razorpay`).

### `verifyRazorpayPayment` (HTTP)
- **How it works:** Receives the payment payload from the client after Razorpay checkout closes. Generates an HMAC-SHA256 signature using the Secret Manager key and compares it. If valid, it runs a transaction to completely upgrade the user's `subscriptions` document and update the payment record to `completed`.
- **Frontend Usage:** Fired in the Razorpay `handler` callback to confirm the payment securely on the server.

### `cancelSubscription` (HTTP)
- **How it works:** Marks a subscription as `cancelled` but preserves the `subscriptionEndDate`. 
- **Frontend Usage:** Triggered by the "Cancel Plan" button in settings.

### `checkExpiredSubscriptions` (Scheduled - Every 24 Hours)
- **How it works:** Scans for subscriptions whose `subscriptionEndDate` has passed and downgrades them to the `free` tier.
- **Frontend Usage:** Background process to enforce paywalls once billing cycles end.

### `getPaymentHistory` (HTTP)
- **How it works:** Returns all payment receipts for the user.
- **Frontend Usage:** Populates the "Billing History" table in settings.

### `razorpayWebhook` (HTTP)
- **How it works:** Listens for backend-to-backend webhooks directly from Razorpay's servers (e.g., recurring payment failures or successes).

---

## 🌸 7. Public Garden (Community Flowers)

A public communal space feature.

### `plantFlower` (HTTP)
- **How it works:** Takes X/Y coordinates, title, and message, sanitizes them, and saves to the `flowers` collection.
- **Frontend Usage:** Used in the "Garden" community view when a user places a new memory marker.

### `getFlowers` (HTTP)
- **How it works:** Fetches flowers, optionally bounded by Min/Max X coordinates for spatial querying.
- **Frontend Usage:** Renders the interactive public garden map.

---

## 📧 8. Admin & Marketing

### `sendMarketingBlast` (HTTP)
- **How it works:** Protected by a custom Admin Secret. Uses the `Resend` SDK and `@react-email/components` to send rich HTML marketing emails to a list of users.
- **Frontend Usage:** Not used directly by the main frontend app (internal admin tool).

### `initUserPlans` (HTTP)
- **How it works:** A migration utility that loops through all users and initializes them with a `free` plan if they don't have one.
- **Frontend Usage:** Internal dev utility.

---

## 🌐 Frontend Integration Pattern

The frontend typically uses a helper function (e.g., using native `fetch` or a configured HTTP client) to interface with these Cloud Functions:

1. **Authentication:** The frontend fetches the user's ID Token via `auth.currentUser.getIdToken()`.
2. **Headers:** This token is injected into the `Authorization: Bearer <token>` header of every request.
3. **CORS:** All HTTP functions are wrapped in a `corsHandler` allowing requests from `localhost` and the deployed domains.
4. **Error Handling:** The frontend catches standard HTTP status codes (e.g., `403` for limits reached, `401` for unauthorized) and maps them to toast notifications or paywall modals.
