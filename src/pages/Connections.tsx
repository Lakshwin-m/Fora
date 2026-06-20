import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Users,
  UserPlus,
  UserMinus,
  Loader2,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  RefreshCw,
  Heart,
  Send,
  ArrowRight,
} from "lucide-react";
import {
  apiGetFriends,
  apiGetPendingRequests,
  apiAcceptFriendRequest,
  apiRejectFriendRequest,
  apiRemoveFriend,
  apiSearchUsers,
  apiSendFriendRequest,
} from "@/services/friendServices";
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/contexts/LanguageContext";

/* ================= TYPES ================= */

interface UserProfile {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  username?: string;
}

interface Friend {
  id: string;
  profile: UserProfile;
}

interface PendingRequest {
  id: string;
  senderName?: string;
  senderEmail?: string;
  senderPhotoURL?: string;
  senderUid?: string;
}

interface SearchResult {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  username?: string;
}

/* ================= HELPERS ================= */

const getInitials = (name?: string) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

/* ================= SKELETON COMPONENTS ================= */

const SkeletonCard = () => (
  <div className="animate-pulse flex items-center gap-4 p-4 rounded-2xl bg-[#FFF9EC]/20 border border-[#5D2A42]/5">
    <div className="w-12 h-12 rounded-full bg-[#5D2A42]/10" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 bg-[#5D2A42]/10 rounded-full w-28" />
      <div className="h-3 bg-[#5D2A42]/10 rounded-full w-40" />
    </div>
    <div className="h-8 w-20 bg-[#5D2A42]/10 rounded-lg" />
  </div>
);

const SkeletonSuggestion = () => (
  <div className="animate-pulse flex-shrink-0 w-full p-4 rounded-2xl bg-white border border-[#5D2A42]/10">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#5D2A42]/10" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-[#5D2A42]/10 rounded-full w-24" />
        <div className="h-2 bg-[#5D2A42]/10 rounded-full w-16" />
      </div>
      <div className="h-7 w-7 rounded-full bg-[#5D2A42]/10" />
    </div>
  </div>
);

/* ================= CSS KEYFRAMES (injected) ================= */

const styleId = "connections-page-animations";
if (typeof document !== "undefined" && !document.getElementById(styleId)) {
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes conn-fade-up {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes conn-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes conn-slide-down {
      from { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; margin-bottom: 0; }
      to { opacity: 1; max-height: 500px; }
    }

    .conn-fade-up {
      animation: conn-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }
    .conn-fade-in {
      animation: conn-fade-in 0.4s ease-out forwards;
    }
    .conn-slide-down {
      animation: conn-slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }

    .conn-stagger-1 { animation-delay: 0.05s; }
    .conn-stagger-2 { animation-delay: 0.1s; }
    .conn-stagger-3 { animation-delay: 0.15s; }
    .conn-stagger-4 { animation-delay: 0.2s; }
    .conn-stagger-5 { animation-delay: 0.25s; }
    .conn-stagger-6 { animation-delay: 0.3s; }
    .conn-stagger-7 { animation-delay: 0.35s; }
    .conn-stagger-8 { animation-delay: 0.4s; }
    .conn-stagger-9 { animation-delay: 0.45s; }
    .conn-hide-scrollbar::-webkit-scrollbar { display: none; }
    .conn-hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `;
  document.head.appendChild(style);
}

/* ================= COMPONENT ================= */

const Connections = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  /* ---- Auth ---- */
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ---- Data ---- */
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ---- Active tab ---- */
  const [activeTab, setActiveTab] = useState<"following" | "followers" | "requests">("following");

  /* ---- Unified Search ---- */
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  /* ---- Suggestions ---- */
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  /* ---- Hover state for unfollow buttons ---- */
  const [hoveredFriend, setHoveredFriend] = useState<string | null>(null);

  /* ================= AUTH ================= */
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

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (!authReady) return;
    loadAll();
    loadSuggestions();
  }, [authReady]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [friendsData, pendingData] = await Promise.all([
        apiGetFriends(),
        apiGetPendingRequests(),
      ]);
      setFriends(friendsData || []);
      setPending(pendingData || []);
    } catch (err) {
      console.error(err);
      toast({
        title: t('common.error'),
        description: t('connections.toastLoadError'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const queries = ["a", "e", "i", "s", "m"];
      const randomQuery = queries[Math.floor(Math.random() * queries.length)];
      const results = await apiSearchUsers(randomQuery);

      const currentUid = auth.currentUser?.uid;
      const friendUids = new Set(friends.map((f) => f.profile?.uid));

      const filtered = (results || []).filter(
        (r: SearchResult) => r.uid !== currentUid && !friendUids.has(r.uid)
      );

      setSuggestions(filtered.slice(0, 12));
    } catch {
      console.log("Suggestions unavailable");
    } finally {
      setSuggestionsLoading(false);
    }
  };

  /* ================= UNIFIED SEARCH LOGIC ================= */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery.toLowerCase().trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const filteredFriends = debouncedQuery
    ? friends.filter(
        (f) =>
          f.profile?.name?.toLowerCase().includes(debouncedQuery) ||
          f.profile?.email?.toLowerCase().includes(debouncedQuery) ||
          f.profile?.username?.toLowerCase().includes(debouncedQuery)
      )
    : friends;

  const filteredPending = debouncedQuery
    ? pending.filter(
        (p) =>
          p.senderName?.toLowerCase().includes(debouncedQuery) ||
          p.senderEmail?.toLowerCase().includes(debouncedQuery)
      )
    : pending;

  useEffect(() => {
    const fetchGlobal = async () => {
      if (!debouncedQuery) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const results = await apiSearchUsers(debouncedQuery);
        const friendUids = new Set(friends.map((f) => f.profile?.uid));
        const pendingUids = new Set(pending.map((p) => p.senderUid));
        const currentUid = auth.currentUser?.uid;
        
        const filtered = (results || []).filter(
          (r: SearchResult) => r.uid !== currentUid && !friendUids.has(r.uid) && !pendingUids.has(r.uid)
        );
        setSearchResults(filtered);
      } catch {
        // Silent fail for live search
      } finally {
        setSearching(false);
      }
    };
    fetchGlobal();
  }, [debouncedQuery, friends, pending]);

  /* ================= ACTIONS ================= */
  const handleSendRequest = async (uid: string) => {
    setActionLoading(uid);
    try {
      await apiSendFriendRequest(uid);
      setSentRequests((prev) => new Set(prev).add(uid));
      setSuggestions((prev) => prev.filter((s) => s.uid !== uid));
      toast({ title: t('connections.toastRequestSent') });
    } catch {
      toast({
        title: t('connections.toastRequestFailed'),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (id: string) => {
    setActionLoading(id);
    try {
      await apiRemoveFriend(id);
      toast({ title: t('connections.toastUnfollowed') });
      await loadAll();
    } catch {
      toast({
        title: t('connections.toastUnfollowFailed'),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await apiAcceptFriendRequest(id);
      toast({ title: t('connections.toastAcceptSuccess') });
      await loadAll();
    } catch {
      toast({
        title: t('connections.toastAcceptFailed'),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await apiRejectFriendRequest(id);
      toast({ title: t('connections.toastDeclineSuccess') });
      await loadAll();
    } catch {
      toast({
        title: t('connections.toastDeclineFailed'),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  /* ================= LOADING STATE ================= */
  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <main className="ml-0 md:ml-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8 animate-pulse">
              <div className="h-9 bg-[#5D2A42]/10 rounded-xl w-48 mb-3" />
              <div className="h-4 bg-[#5D2A42]/10 rounded-lg w-64" />
            </div>
            <div className="flex gap-2 mb-6">
              <div className="h-10 w-24 bg-[#5D2A42]/10 rounded-xl animate-pulse" />
              <div className="h-10 w-24 bg-[#5D2A42]/10 rounded-xl animate-pulse" />
              <div className="h-10 w-24 bg-[#5D2A42]/10 rounded-xl animate-pulse" />
            </div>
            <div className="h-14 bg-[#5D2A42]/10 rounded-2xl w-full mb-8 animate-pulse" />
            <div className="bg-white rounded-3xl p-6 border border-[#5D2A42]/10 shadow-sm animate-pulse">
              <div className="h-4 w-32 bg-[#5D2A42]/10 rounded mb-6" />
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />

      <main className="ml-0 md:ml-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* Header */}
          <div className="mb-8 conn-fade-up">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#5D2A42] tracking-tight mb-2">
              {t('connections.title')}
            </h1>
            <p className="text-[#5D2A42]/70 text-sm font-medium">
              {t('connections.subtitle')}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6 conn-fade-up conn-stagger-1">
            <button
              onClick={() => setActiveTab("following")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === "following"
                  ? "bg-[#5D2A42] text-white shadow-sm"
                  : "bg-white border border-[#5D2A42]/10 text-[#5D2A42]/70 hover:bg-[#5D2A42]/5"
              }`}
            >
              {t('connections.following')} <span className="ml-1 opacity-70">{friends.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("followers")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === "followers"
                  ? "bg-[#5D2A42] text-white shadow-sm"
                  : "bg-white border border-[#5D2A42]/10 text-[#5D2A42]/70 hover:bg-[#5D2A42]/5"
              }`}
            >
              {t('connections.followers')} <span className="ml-1 opacity-70">{friends.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === "requests"
                  ? "bg-[#FB6376] text-white shadow-sm"
                  : "bg-white border border-[#FB6376]/20 text-[#FB6376] hover:bg-[#FB6376]/5"
              }`}
            >
              {t('connections.followRequests') || 'Requests'} <span className="ml-1 opacity-70">{pending.length}</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-8 conn-fade-up conn-stagger-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D2A42]/40" />
            <Input
              className="pl-12 pr-10 bg-white border-[#5D2A42]/10 focus:border-[#FB6376]/50 text-[#5D2A42] rounded-2xl h-14 text-base shadow-sm placeholder:text-[#5D2A42]/40 transition-all duration-300 focus-visible:ring-0 focus-visible:outline-none"
              placeholder={t('connections.searchPlaceholder') || "Search connections and discover..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-[#5D2A42]/40 hover:text-[#5D2A42] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="space-y-6 conn-fade-up conn-stagger-3">
            {searchQuery ? (
              // ACTIVE SEARCH STATE
              <div className="bg-white rounded-3xl p-6 border border-[#5D2A42]/10 shadow-sm">
                <h3 className="text-sm font-bold text-[#5D2A42]/60 uppercase tracking-wider mb-4">
                  {t('connections.searchResults') || "Search Results"}
                </h3>
                
                <div className="grid grid-cols-1 gap-2">
                  {/* Local Friends */}
                  {filteredFriends.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 hover:bg-[#FFF9EC]/50 rounded-2xl transition-colors group">
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${f.profile?.uid}`)}>
                        <Avatar className="w-12 h-12 border-2 border-[#5D2A42]/5 group-hover:border-[#FB6376]/40 transition-colors">
                          <AvatarImage src={f.profile?.photoURL} />
                          <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] font-bold">
                            {getInitials(f.profile?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-[#5D2A42] group-hover:text-[#FB6376] transition-colors">{f.profile?.name || "Unknown"}</p>
                          <p className="text-xs text-[#5D2A42]/60 font-mono">{f.profile?.username ? `@${f.profile.username}` : f.profile?.email}</p>
                        </div>
                      </div>
                      <button
                        className={`h-9 px-4 rounded-xl text-xs font-bold transition-all border ${
                          hoveredFriend === f.id
                            ? "bg-[#FB6376]/10 border-[#FB6376]/35 text-[#FB6376]"
                            : "bg-white border-[#5D2A42]/10 text-[#5D2A42]/80 shadow-sm hover:bg-[#5D2A42]/5"
                        }`}
                        disabled={actionLoading === f.id}
                        onClick={() => handleRemove(f.id)}
                        onMouseEnter={() => setHoveredFriend(f.id)}
                        onMouseLeave={() => setHoveredFriend(null)}
                      >
                        {actionLoading === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : hoveredFriend === f.id ? t('connections.unfollow') || 'Unfollow' : t('connections.following') || 'Following'}
                      </button>
                    </div>
                  ))}

                  {/* Local Pending */}
                  {filteredPending.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 hover:bg-[#FFF9EC]/50 rounded-2xl transition-colors group">
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${p.senderUid}`)}>
                        <Avatar className="w-12 h-12 border-2 border-[#5D2A42]/5 group-hover:border-[#FB6376]/40 transition-colors">
                          <AvatarImage src={p.senderPhotoURL} />
                          <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] font-bold">
                            {getInitials(p.senderName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-[#5D2A42] group-hover:text-[#FB6376] transition-colors">{p.senderName || "Unknown"}</p>
                          <p className="text-xs text-[#5D2A42]/60 font-mono">{p.senderEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-[#FB6376] hover:bg-[#e8556a] text-white rounded-xl h-9 px-4 text-xs font-bold" disabled={actionLoading === p.id} onClick={() => handleAccept(p.id)}>
                          {actionLoading === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('connections.accept') || 'Accept'}
                        </Button>
                        <Button size="sm" variant="outline" className="border-[#5D2A42]/15 text-[#5D2A42]/80 hover:bg-[#5D2A42]/5 rounded-xl h-9 px-3" disabled={actionLoading === p.id} onClick={() => handleReject(p.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Global Results */}
                  {searchResults.map((user) => {
                    const alreadySent = sentRequests.has(user.uid);
                    return (
                      <div key={user.uid} className="flex items-center justify-between p-3 hover:bg-[#FFF9EC]/50 rounded-2xl transition-colors group">
                        <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${user.uid}`)}>
                          <Avatar className="w-12 h-12 border-2 border-[#5D2A42]/5 group-hover:border-[#FB6376]/40 transition-colors">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] font-bold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-[#5D2A42] group-hover:text-[#FB6376] transition-colors">{user.name || "Unknown"}</p>
                            <p className="text-xs text-[#5D2A42]/60 font-mono">{user.username ? `@${user.username}` : user.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                            alreadySent
                              ? "bg-[#5D2A42]/5 text-[#5D2A42]/50 hover:bg-[#5D2A42]/5"
                              : "bg-[#FB6376] hover:bg-[#e8556a] text-white shadow-sm"
                          }`}
                          disabled={alreadySent || actionLoading === user.uid}
                          onClick={() => handleSendRequest(user.uid)}
                        >
                          {actionLoading === user.uid ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : alreadySent ? (
                            t('connections.requested') || "Requested"
                          ) : (
                            t('connections.follow') || "Follow"
                          )}
                        </Button>
                      </div>
                    );
                  })}

                  {filteredFriends.length === 0 && filteredPending.length === 0 && searchResults.length === 0 && (
                    <div className="py-12 text-center text-[#5D2A42]/50">
                      {searching ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#FB6376]" /> : (t('connections.noUsersFound') || "No users found")}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // DEFAULT STATE
              <div className="space-y-6">
                
                {/* Active Tab Content */}
                <div className="bg-white rounded-3xl p-6 border border-[#5D2A42]/10 shadow-sm">
                  {activeTab === "following" || activeTab === "followers" ? (
                    <div>
                      <h3 className="text-sm font-bold text-[#5D2A42]/60 uppercase tracking-wider mb-4">
                        {activeTab === "following" ? t('connections.following') : t('connections.followers')}
                      </h3>
                      {friends.length === 0 ? (
                        <div className="py-8 text-center text-[#5D2A42]/50 text-sm">
                          {t('connections.noConnections') || "No connections yet"}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {friends.map((f) => (
                            <div key={f.id} className="flex items-center justify-between p-3 hover:bg-[#FFF9EC]/50 rounded-2xl transition-colors group">
                              <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${f.profile?.uid}`)}>
                                <Avatar className="w-12 h-12 border-2 border-[#5D2A42]/5 group-hover:border-[#FB6376]/40 transition-colors">
                                  <AvatarImage src={f.profile?.photoURL} />
                                  <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] font-bold">
                                    {getInitials(f.profile?.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-bold text-[#5D2A42] group-hover:text-[#FB6376] transition-colors">{f.profile?.name || "Unknown"}</p>
                                  <p className="text-xs text-[#5D2A42]/60 font-mono">{f.profile?.username ? `@${f.profile.username}` : f.profile?.email}</p>
                                </div>
                              </div>
                              <button
                                className={`h-9 px-4 rounded-xl text-xs font-bold transition-all border ${
                                  hoveredFriend === f.id
                                    ? "bg-[#FB6376]/10 border-[#FB6376]/35 text-[#FB6376]"
                                    : "bg-white border-[#5D2A42]/10 text-[#5D2A42]/80 shadow-sm hover:bg-[#5D2A42]/5"
                                }`}
                                disabled={actionLoading === f.id}
                                onClick={() => handleRemove(f.id)}
                                onMouseEnter={() => setHoveredFriend(f.id)}
                                onMouseLeave={() => setHoveredFriend(null)}
                              >
                                {actionLoading === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : hoveredFriend === f.id ? t('connections.unfollow') || 'Unfollow' : t('connections.following') || 'Following'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-sm font-bold text-[#5D2A42]/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> {t('connections.followRequests') || "Pending Requests"}
                      </h3>
                      {pending.length === 0 ? (
                        <div className="py-8 text-center text-[#5D2A42]/50 text-sm">
                          {t('connections.noRequests') || "No pending requests"}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {pending.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-3 hover:bg-[#FFF9EC]/50 rounded-2xl transition-colors group">
                              <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${p.senderUid}`)}>
                                <Avatar className="w-12 h-12 border-2 border-[#5D2A42]/5 group-hover:border-[#FB6376]/40 transition-colors">
                                  <AvatarImage src={p.senderPhotoURL} />
                                  <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] font-bold">
                                    {getInitials(p.senderName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-bold text-[#5D2A42] group-hover:text-[#FB6376] transition-colors">{p.senderName || "Unknown"}</p>
                                  <p className="text-xs text-[#5D2A42]/60 font-mono">{p.senderEmail}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" className="bg-[#FB6376] hover:bg-[#e8556a] text-white rounded-xl h-9 px-4 text-xs font-bold" disabled={actionLoading === p.id} onClick={() => handleAccept(p.id)}>
                                  {actionLoading === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('connections.accept') || 'Accept'}
                                </Button>
                                <Button size="sm" variant="outline" className="border-[#5D2A42]/15 text-[#5D2A42]/80 hover:bg-[#5D2A42]/5 rounded-xl h-9 px-3" disabled={actionLoading === p.id} onClick={() => handleReject(p.id)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Suggested People */}
                <div className="bg-white rounded-3xl p-6 border border-[#5D2A42]/10 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[#5D2A42]/60 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#FB6376]" /> {t('connections.suggestedForYou') || "Suggested People"}
                    </h3>
                    <button onClick={loadSuggestions} disabled={suggestionsLoading} className="text-[#5D2A42]/40 hover:text-[#5D2A42] p-1 rounded-lg hover:bg-[#5D2A42]/5 transition-colors">
                      <RefreshCw className={`w-4 h-4 ${suggestionsLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestionsLoading ? (
                       <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#FB6376]" /></div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map((user) => {
                        const alreadySent = sentRequests.has(user.uid);
                        return (
                          <div key={user.uid} className="flex items-center justify-between p-3 hover:bg-[#FFF9EC]/50 rounded-2xl transition-colors group">
                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${user.uid}`)}>
                              <Avatar className="w-12 h-12 border-2 border-[#5D2A42]/5 group-hover:border-[#FB6376]/40 transition-colors">
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] font-bold">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-[#5D2A42] group-hover:text-[#FB6376] transition-colors">{user.name || "Unknown"}</p>
                                <p className="text-xs text-[#5D2A42]/60 font-mono">{user.username ? `@${user.username}` : user.email}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                                alreadySent
                                  ? "bg-[#5D2A42]/5 text-[#5D2A42]/50 hover:bg-[#5D2A42]/5"
                                  : "bg-[#FB6376] hover:bg-[#e8556a] text-white shadow-sm"
                              }`}
                              disabled={alreadySent || actionLoading === user.uid}
                              onClick={() => handleSendRequest(user.uid)}
                            >
                              {actionLoading === user.uid ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : alreadySent ? (
                                t('connections.requested') || "Requested"
                              ) : (
                                t('connections.follow') || "Follow"
                              )}
                            </Button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-[#5D2A42]/50 text-sm">
                        {t('connections.noSuggestions') || "No suggestions at the moment"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Connections;
