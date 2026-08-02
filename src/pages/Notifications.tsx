import { useEffect, useState } from "react";
import { useTranslation } from "@/contexts/LanguageContext";
import Navigation from "@/components/Navigation";
import { UserPlus, Check, X, Sparkles, Loader2, Bell, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiGetPendingRequests, apiAcceptFriendRequest, apiRejectFriendRequest } from "@/services/friendServices";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";

interface NotificationItem {
  id: string; // The friendship document ID or request ID
  type: "follow_request" | "follow_accepted" | "capsule_collab" | string;
  capsuleId?: string;
  message?: string;
  user: {
    uid: string;
    name: string;
    email: string;
    photoURL?: string;
  };
  time: string;
  read: boolean;
}

const getInitials = (name?: string) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

export default function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!authReady) return;
    loadNotifications();
  }, [authReady]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const [pendingData, dbNotifsSnapshot] = await Promise.all([
        apiGetPendingRequests().catch(() => []),
        getDocs(query(
          collection(db, "notifications"),
          where("userId", "==", currentUid),
          orderBy("createdAt", "desc")
        )).catch(() => ({ docs: [] }))
      ]);

      let loadedNotifications: NotificationItem[] = [];

      (pendingData || []).forEach((p: any) => {
        if (!p.senderUid || p.senderUid === currentUid) return;
        loadedNotifications.push({
          id: p.id, // The friendship ID from the backend
          type: "follow_request",
          user: {
            uid: p.senderUid,
            name: p.senderName || "Unknown",
            email: p.senderEmail || "",
            photoURL: p.senderPhotoURL,
          },
          time: "New", // Real timestamps would require backend support, using "New" for now
          read: false,
        });
      });

      // Parse DB notifications
      dbNotifsSnapshot.docs?.forEach((d: any) => {
        const data = d.data();
        loadedNotifications.push({
          id: d.id,
          type: data.type,
          message: data.message,
          capsuleId: data.capsuleId,
          user: {
            uid: data.senderId || "system",
            name: data.senderName || "System",
            email: "",
            photoURL: data.senderPhotoURL,
          },
          time: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : "New",
          read: data.read || false,
        });
      });

      setNotifications(loadedNotifications);
    } catch (err) {
      console.error("Error loading notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleAcceptRequest = async (id: string) => {
    if (!id) return;
    setProcessingId(id);
    try {
      await apiAcceptFriendRequest(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, type: "follow_accepted", read: true } : n))
      );
    } catch (err) {
      console.error("Failed to accept request", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleViewCapsule = (id: string, capsuleId: string) => {
    handleMarkAsRead(id);
    navigate(`/capsule/${capsuleId}`);
  };


  const handleRejectRequest = async (id: string) => {
    if (!id) return;
    setProcessingId(id);
    try {
      await apiRejectFriendRequest(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to reject request", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (!authReady) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#FFF9EC] relative overflow-hidden font-sans pb-24">
      <Navigation />

      {/* Decorative background elements matching Connections */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-[#FB6376]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tl from-[#5D2A42]/5 to-transparent blur-3xl pointer-events-none" />

      <main className="ml-0 md:ml-20 flex flex-col items-center pt-16 md:pt-24 px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl relative"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-12 gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-[#5D2A42] tracking-tight flex items-center gap-4">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-[#FB6376] text-white text-lg font-bold px-3 py-1 rounded-full shadow-[0_4px_15px_rgb(251,99,118,0.3)]">
                    {unreadCount} new
                  </span>
                )}
              </h1>
              <p className="text-[#5D2A42]/60 font-medium text-lg mt-3">
                Stay updated with your connection requests and activities.
              </p>
            </div>
          </div>

          {/* Notifications List */}
          <div className="w-full space-y-4 relative z-10">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#FB6376]/50 animate-spin" />
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {notifications.length > 0 ? (
                  notifications.map((notification, idx) => (
                    <motion.div
                      key={notification.id}
                      layout
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: idx * 0.03 }}
                      className={`
                        relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 md:p-5 backdrop-blur-md rounded-[24px] border transition-all duration-300 group
                        ${
                          notification.read
                            ? "bg-white/60 border-[#5D2A42]/5 hover:bg-white"
                            : "bg-white border-[#FB6376]/30 shadow-[0_8px_30px_rgb(93,42,66,0.06)]"
                        }
                      `}
                    >
                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-[#FB6376] rounded-full shadow-sm ring-4 ring-[#FFF9EC]" />
                      )}

                      <Avatar className="w-14 h-14 md:w-16 md:h-16 border-2 border-transparent group-hover:border-[#FB6376]/20 transition-all duration-300 shadow-sm shrink-0">
                        <AvatarImage src={notification.user.photoURL} />
                        <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] font-extrabold text-lg">
                          {getInitials(notification.user.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-[#5D2A42] text-base md:text-lg leading-snug">
                          <span className="font-extrabold cursor-pointer hover:text-[#FB6376] transition-colors" onClick={() => navigate(`/profile/${notification.user.uid}`)}>
                            {notification.user.name}
                          </span>{" "}
                          {notification.type === "follow_request" ? (
                            <span className="text-[#5D2A42]/80 font-medium">requested to follow you.</span>
                          ) : notification.type === "capsule_collab" ? (
                            <span className="text-[#5D2A42]/80 font-medium">created a collab capsule with you!</span>
                          ) : (
                            <span className="text-[#5D2A42]/80 font-medium">{notification.message || "accepted your follow request."}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-[#5D2A42]/40 font-bold uppercase tracking-wider">
                          {notification.type === "follow_request" ? (
                            <UserPlus className="w-3.5 h-3.5 text-[#FB6376]" />
                          ) : notification.type === "capsule_collab" ? (
                            <MessageCircle className="w-3.5 h-3.5 text-[#FB6376]" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-[#FB6376]" />
                          )}
                          {notification.time}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                        {notification.type === "follow_request" && (
                          <>
                            <Button
                              onClick={() => handleAcceptRequest(notification.id)}
                              disabled={processingId === notification.id}
                              className="flex-1 sm:flex-none bg-[#FB6376] hover:bg-[#e05668] text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all h-10 md:h-12 px-6"
                            >
                              {processingId === notification.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                "Accept"
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleRejectRequest(notification.id)}
                              disabled={processingId === notification.id}
                              className="flex-1 sm:flex-none text-[#5D2A42]/50 hover:text-[#5D2A42] hover:bg-[#5D2A42]/5 rounded-xl font-bold h-10 md:h-12 px-4"
                            >
                              <X className="w-5 h-5" />
                            </Button>
                          </>
                        )}
                        {notification.type === "capsule_collab" && notification.capsuleId && (
                          <Button
                            onClick={() => handleViewCapsule(notification.id, notification.capsuleId!)}
                            className="flex-1 sm:flex-none bg-[#FB6376] hover:bg-[#e05668] text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all h-10 md:h-12 px-6"
                          >
                            View Capsule
                          </Button>
                        )}
                        {notification.type === "follow_accepted" && (
                          <div className="px-4 py-2 bg-[#5D2A42]/5 text-[#5D2A42] rounded-xl text-sm font-bold flex items-center gap-2 w-full sm:w-auto justify-center">
                            <Check className="w-4 h-4" /> Friends
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16"
                  >
                    <div className="w-20 h-20 bg-white rounded-[2rem] mx-auto flex items-center justify-center border border-[#5D2A42]/10 mb-6 shadow-sm">
                      <Bell className="w-8 h-8 text-[#5D2A42]/20" />
                    </div>
                    <h3 className="text-xl font-bold text-[#5D2A42] mb-2">No new notifications</h3>
                    <p className="text-[#5D2A42]/50 font-medium">
                      When you get follow requests or updates, they'll show up here.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
