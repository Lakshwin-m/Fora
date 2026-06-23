import { auth } from "@/firebase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function authedFetch(path: string, body?: any) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Auth not ready");
  }

  // Use cached token for much faster requests
  const token = await user.getIdToken();

  const res = await fetch(`${BASE_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }

  return res.json();
}

/* ================= FRIEND APIs ================= */

export const apiGetFriends = () => authedFetch("getFriends");

export const apiSendFriendRequest = (receiverId: string) =>
  authedFetch("sendFriendRequest", { receiverId });

export const apiAcceptFriendRequest = (friendshipId: string) =>
  authedFetch("acceptFriendRequest", { friendshipId });

export const apiRemoveFriend = (friendshipId: string) =>
  authedFetch("removeFriend", { friendshipId });

export const apiGetPendingRequests = () => authedFetch("getPendingRequests");

export const apiRejectFriendRequest = (friendshipId: string) =>
  authedFetch("rejectFriendRequest", { friendshipId });
export const apiSearchUsers = (query: string) =>
  authedFetch("searchUsers", { query });
