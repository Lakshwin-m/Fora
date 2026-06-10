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
  const suggestionsRef = useRef<HTMLDivElement>(null);

  /* ---- Auth ---- */
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ---- Data ---- */
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ---- Pending banner ---- */
  const [pendingExpanded, setPendingExpanded] = useState(true);

  /* ---- Active list toggle ---- */
  const [activeList, setActiveList] = useState<"followers" | "following">("following");

  /* ---- Local Filter ---- */
  const [localQuery, setLocalQuery] = useState("");
  const [debouncedLocalQuery, setDebouncedLocalQuery] = useState("");

  /* ---- Global Search ---- */
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false); // true when showing API results
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
      // Fetch users dynamically using a guaranteed trigger
      const results = await apiSearchUsers("SUGGESTIONS_TRIGGER");

      const currentUid = auth.currentUser?.uid;
      const friendUids = new Set(friends.map((f) => f.profile?.uid));

      const filtered = (results || []).filter(
        (r: SearchResult) => r.uid !== currentUid && !friendUids.has(r.uid)
      );

      setSuggestions(filtered.slice(0, 12));
    } catch {
      // Silently fail — suggestions are non-critical
          } finally {
      setSuggestionsLoading(false);
    }
  };

  /* ================= DEBOUNCED LOCAL FILTER ================= */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedLocalQuery(localQuery.toLowerCase());
    }, 250);
    return () => clearTimeout(t);
  }, [localQuery]);

  const filteredFriends = debouncedLocalQuery
    ? friends.filter(
        (f) =>
          f.profile?.name?.toLowerCase().includes(debouncedLocalQuery) ||
          f.profile?.email?.toLowerCase().includes(debouncedLocalQuery) ||
          f.profile?.username?.toLowerCase().includes(debouncedLocalQuery)
      )
    : friends;

  /* ================= API SEARCH ================= */
  const handleGlobalSearch = useCallback(async () => {
    if (!globalQuery.trim()) {
      setSearchMode(false);
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchMode(true);
    try {
      const results = await apiSearchUsers(globalQuery.trim());
      const friendUids = new Set(friends.map((f) => f.profile?.uid));
      const currentUid = auth.currentUser?.uid;
      const filtered = (results || []).filter(
        (r: SearchResult) => r.uid !== currentUid && !friendUids.has(r.uid)
      );
      setSearchResults(filtered);
    } catch {
      toast({
        title: t('connections.toastSearchError'),
        description: t('connections.toastSearchError'),
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  }, [globalQuery, friends, t]);

  /* ================= ACTIONS ================= */
  const handleSendRequest = async (uid: string) => {
    setActionLoading(uid);
    try {
      await apiSendFriendRequest(uid);
      setSentRequests((prev) => new Set(prev).add(uid));
      // Remove from suggestions
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

  const clearSearch = () => {
    setGlobalQuery("");
    setSearchMode(false);
    setSearchResults([]);
  };

  /* ================= LOADING STATE ================= */
  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <main className="ml-0 md:ml-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header / Stats row skeleton */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10 border-b border-[#5D2A42]/5 pb-8 animate-pulse">
              <div>
                <div className="h-9 bg-[#5D2A42]/10 rounded-xl w-48 mb-3" />
                <div className="h-4 bg-[#5D2A42]/10 rounded-lg w-64" />
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="h-18 bg-[#5D2A42]/10 rounded-2xl w-36" />
                <div className="h-18 bg-[#5D2A42]/10 rounded-2xl w-36" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left column skeleton */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="bg-white border border-[#5D2A42]/10 rounded-3xl p-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-[#5D2A42]/5 pb-4">
                    <div className="h-6 bg-[#5D2A42]/10 rounded-lg w-28" />
                    <div className="h-10 bg-[#5D2A42]/10 rounded-xl w-48" />
                  </div>
                  <div className="h-11 bg-[#5D2A42]/10 rounded-2xl w-full" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column skeleton */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-white border border-[#5D2A42]/10 rounded-3xl p-5 flex flex-col gap-4">
                  <div className="h-5 bg-[#5D2A42]/10 rounded-lg w-32 mb-2" />
                  <div className="h-10 bg-[#5D2A42]/10 rounded-xl w-full" />
                </div>
                <div className="bg-white border border-[#5D2A42]/10 rounded-3xl p-5 flex flex-col gap-4">
                  <div className="h-5 bg-[#5D2A42]/10 rounded-lg w-36 mb-2" />
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#5D2A42]/10" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-[#5D2A42]/10 rounded-full w-24" />
                          <div className="h-2 bg-[#5D2A42]/10 rounded-full w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
          
          {/* ========== HEADER SECTION WITH STATS ========== */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10 border-b border-[#5D2A42]/5 pb-8 conn-fade-up">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#5D2A42] tracking-tight mb-2 flex items-center gap-3">
                <Users className="w-8 h-8 text-[#FB6376]" />
                {t('connections.title')}
              </h1>
              <p className="text-[#5D2A42]/70 text-sm sm:text-base font-medium">
                {t('connections.subtitle')}
              </p>
            </div>

            {/* Premium Metric Badges */}
            <div className="flex flex-wrap gap-4">
              <div className="bg-white border border-[#5D2A42]/10 rounded-2xl p-4 flex items-center gap-4 min-w-[140px] shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-[#FB6376]/10 flex items-center justify-center text-[#FB6376]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#5D2A42] tabular-nums leading-none mb-1">{friends.length}</div>
                  <div className="text-[11px] text-[#5D2A42]/60 font-bold uppercase tracking-wider">{t('connections.following')}</div>
                </div>
              </div>
              
              <div className="bg-white border border-[#5D2A42]/10 rounded-2xl p-4 flex items-center gap-4 min-w-[140px] shadow-sm hover:shadow-md transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-[#5D2A42]/10 flex items-center justify-center text-[#5D2A42]">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#5D2A42] tabular-nums leading-none mb-1">{friends.length}</div>
                  <div className="text-[11px] text-[#5D2A42]/60 font-bold uppercase tracking-wider">{t('connections.followers')}</div>
                </div>
              </div>

              {pending.length > 0 && (
                <div className="bg-white border border-[#FB6376]/30 rounded-2xl p-4 flex items-center gap-4 min-w-[140px] shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-[#FB6376]/25 flex items-center justify-center text-[#FB6376]">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#FB6376] tabular-nums leading-none mb-1">{pending.length}</div>
                    <div className="text-[11px] text-[#FB6376]/80 font-bold uppercase tracking-wider">{t('connections.requests')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ========== LEFT COLUMN: MY CONNECTIONS NETWORK ========== */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white border border-[#5D2A42]/10 rounded-3xl p-6 shadow-sm flex flex-col gap-6 conn-fade-up conn-stagger-1">
                
                {/* Section header & tabs toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#5D2A42]/5 pb-4">
                  <h2 className="text-xl font-bold text-[#5D2A42] flex items-center gap-2">
                    {activeList === "following" ? t('connections.following') : t('connections.followers')}
                  </h2>
                  <div className="flex items-center bg-[#FFF9EC] border border-[#5D2A42]/10 rounded-2xl p-1 shadow-inner w-fit">
                    <button
                      onClick={() => setActiveList("following")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                        activeList === "following"
                          ? "bg-[#FB6376] text-white shadow-sm"
                          : "text-[#5D2A42]/60 hover:text-[#5D2A42] hover:bg-white/50"
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {t('connections.following')}
                      <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${activeList === "following" ? "bg-white/20 text-white" : "bg-[#5D2A42]/10 text-[#5D2A42]"}`}>
                        {friends.length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveList("followers")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                        activeList === "followers"
                          ? "bg-[#5D2A42] text-white shadow-sm"
                          : "text-[#5D2A42]/60 hover:text-[#5D2A42] hover:bg-white/50"
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      {t('connections.followers')}
                      <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${activeList === "followers" ? "bg-white/20 text-white" : "bg-[#5D2A42]/10 text-[#5D2A42]"}`}>
                        {friends.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Local search filter */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#5D2A42]/40" />
                  <Input
                    className="pl-11 pr-10 bg-[#FFF9EC]/40 border-[#5D2A42]/10 focus:border-[#FB6376]/50 focus:bg-white text-[#5D2A42] rounded-2xl h-11 text-sm placeholder:text-[#5D2A42]/40 focus:ring-0 focus-visible:ring-0 transition-all duration-300"
                    placeholder={t('connections.searchPlaceholder')}
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                  />
                  {localQuery && (
                    <button
                      onClick={() => setLocalQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#5D2A42]/40 hover:text-[#5D2A42] rounded-lg hover:bg-[#5D2A42]/5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Connections Cards Grid */}
                <div className="min-h-[220px]">
                  {filteredFriends.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center conn-fade-in">
                      <div className="w-20 h-20 mb-5 bg-[#FFF9EC] border border-[#5D2A42]/10 rounded-3xl flex items-center justify-center text-[#5D2A42]/30">
                        <Users className="w-9 h-9" />
                      </div>
                      <h3 className="text-xl font-bold text-[#5D2A42] mb-2">
                        {localQuery ? t('connections.noMatches') : t('connections.noConnections')}
                      </h3>
                      <p className="text-[#5D2A42]/60 text-sm max-w-sm mb-6">
                        {localQuery
                          ? t('connections.tryDifferentSearch')
                          : t('connections.startBuildingNetwork')}
                      </p>
                      {!localQuery && (
                        <button
                          onClick={() => document.getElementById("global-search-input")?.focus()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FB6376] hover:bg-[#e8556a] text-white text-sm font-bold rounded-xl shadow-sm transition-all duration-200 active:scale-95"
                        >
                          <Search className="w-4.5 h-4.5" />
                          {t('connections.findPeople')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredFriends.map((f, idx) => (
                        <div
                          key={f.id}
                          className={`conn-fade-up conn-stagger-${Math.min(idx + 1, 9)} flex items-center justify-between p-4 bg-[#FFF9EC]/20 rounded-2xl border border-[#5D2A42]/5 hover:border-[#FB6376]/30 hover:bg-white hover:shadow-md transition-all duration-300 group`}
                        >
                          <div 
                            className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer group/item"
                            onClick={() => navigate(`/profile/${f.profile?.uid}`)}
                          >
                            <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-[#5D2A42]/5 group-hover/item:border-[#FB6376]/40 transition-colors duration-300 shadow-sm">
                              <AvatarImage src={f.profile?.photoURL} />
                              <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] text-sm font-bold">
                                {getInitials(f.profile?.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[#5D2A42] text-sm truncate group-hover/item:text-[#FB6376] transition-colors duration-300">
                                {f.profile?.name || "Unknown"}
                              </p>
                              <p className="text-[11px] text-[#5D2A42]/50 truncate font-mono">
                                {f.profile?.username ? `@${f.profile.username}` : f.profile?.email}
                              </p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <button
                              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all duration-200 border ${
                                hoveredFriend === f.id
                                  ? "bg-[#FB6376]/10 border-[#FB6376]/35 text-[#FB6376]"
                                  : "bg-[#5D2A42]/5 border-[#5D2A42]/10 text-[#5D2A42]/80 hover:bg-[#5D2A42]/10"
                              }`}
                              disabled={actionLoading === f.id}
                              onClick={() => handleRemove(f.id)}
                              onMouseEnter={() => setHoveredFriend(f.id)}
                              onMouseLeave={() => setHoveredFriend(null)}
                            >
                              {actionLoading === f.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : hoveredFriend === f.id ? (
                                <>
                                  <UserMinus className="w-3.5 h-3.5 mr-1 inline" />
                                  {t('connections.unfollow')}
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 mr-1 inline" />
                                  {t('connections.following')}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========== RIGHT COLUMN: ACTIVITY, DISCOVER & REQUESTS ========== */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Pending Requests Widget */}
              {pending.length > 0 && (
                <div className="conn-slide-down bg-gradient-to-b from-[#FB6376]/10 to-white border border-[#FB6376]/25 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
                  <h3 className="font-extrabold text-[#5D2A42] flex items-center justify-between text-sm sm:text-base border-b border-[#FB6376]/10 pb-3">
                    <span className="flex items-center gap-2">
                      <div className="relative">
                        <UserPlus className="w-4.5 h-4.5 text-[#FB6376]" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FB6376] rounded-full animate-ping" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FB6376] rounded-full" />
                      </div>
                      {t('connections.followRequests')}
                    </span>
                    <span className="text-xs font-extrabold bg-[#FB6376] text-white px-2 py-0.5 rounded-full shadow-sm tabular-nums">
                      {pending.length}
                    </span>
                  </h3>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto conn-hide-scrollbar pr-1">
                    {pending.map((p) => (
                      <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-[#5D2A42]/10 shadow-sm flex flex-col gap-3 transition-all duration-300 hover:border-[#FB6376]/20">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${p.senderUid}`)}>
                          <Avatar className="w-9 h-9 flex-shrink-0 border border-[#5D2A42]/10">
                            <AvatarImage src={p.senderPhotoURL} />
                            <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-xs font-bold">
                              {getInitials(p.senderName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[#5D2A42] text-xs truncate">{p.senderName || "Unknown"}</p>
                            <p className="text-[10px] text-[#5D2A42]/60 truncate font-mono">{p.senderEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-[#FB6376] hover:bg-[#e8556a] text-white h-8 rounded-xl text-xs font-bold" 
                            disabled={actionLoading === p.id} 
                            onClick={() => handleAccept(p.id)}
                          >
                            {actionLoading === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('connections.accept')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 border-[#5D2A42]/15 text-[#5D2A42]/80 hover:bg-[#5D2A42]/5 h-8 rounded-xl text-xs font-bold" 
                            disabled={actionLoading === p.id} 
                            onClick={() => handleReject(p.id)}
                          >
                            {t('connections.decline')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Global Search / Find People */}
              <div className="bg-white p-6 rounded-3xl border border-[#5D2A42]/10 shadow-sm flex flex-col gap-5 conn-fade-up conn-stagger-2">
                <h3 className="font-extrabold text-[#5D2A42] flex items-center gap-2 text-sm sm:text-base border-b border-[#5D2A42]/5 pb-4.5">
                  <Search className="w-4.5 h-4.5 text-[#FB6376]" />
                  {t('connections.findPeople')}
                </h3>
                
                <div className="relative my-2">
                  <Input
                    id="global-search-input"
                    className="pl-4 pr-11 bg-[#F9F9F9] border-[#E8E8E8] rounded-xl h-11 text-sm placeholder:text-[#BBBBBB] focus:bg-white focus:shadow-sm focus:border-[#5D2A42]/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent focus-visible:outline-none focus:outline-none transition-all duration-300"
                    placeholder={t('connections.searchPlaceholder')}
                    value={globalQuery}
                    onChange={(e) => {
                      setGlobalQuery(e.target.value);
                      if (!e.target.value.trim()) {
                        setSearchMode(false);
                        setSearchResults([]);
                      }
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
                  />
                  <Button
                    size="icon"
                    onClick={handleGlobalSearch}
                    disabled={searching || !globalQuery.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#5D2A42] hover:bg-[#4a2135] text-white h-8 w-8 rounded-lg transition-transform active:scale-95"
                  >
                    {searching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>

                {/* Global Search Results */}
                {searchMode && (
                  <div className="border-t border-[#5D2A42]/5 pt-5 flex flex-col gap-5 conn-fade-in">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold text-[#5D2A42]/60 uppercase tracking-wider">
                        {t('connections.searchResults')}
                      </span>
                      <button onClick={clearSearch} className="text-[10px] font-bold text-[#FB6376] hover:underline">
                        {t('connections.clearSearch')}
                      </button>
                    </div>

                    {searchResults.length === 0 && !searching ? (
                      <p className="text-[#5D2A42]/60 text-xs text-center py-4 italic">
                        {t('connections.noUsersFound')} "{globalQuery}"
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                        {searchResults.map((user) => {
                          const alreadySent = sentRequests.has(user.uid);
                          return (
                            <div key={user.uid} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#FFF9EC]/20 border border-[#5D2A42]/5">
                              <div className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1" onClick={() => navigate(`/profile/${user.uid}`)}>
                                <Avatar className="w-8 h-8 flex-shrink-0 border border-[#5D2A42]/10 shadow-sm">
                                  <AvatarImage src={user.photoURL} />
                                  <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-[10px] font-bold">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-[#5D2A42] text-xs truncate">{user.name}</p>
                                  <p className="text-[9px] text-[#5D2A42]/50 truncate font-mono">
                                    {user.username ? `@${user.username}` : user.email}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className={`h-7 px-2.5 rounded-lg text-[10px] font-bold transition-all ${
                                  alreadySent
                                    ? "bg-[#5D2A42]/5 text-[#5D2A42]/50 cursor-default"
                                    : "bg-[#FB6376] hover:bg-[#e8556a] text-white hover:shadow-sm"
                                }`}
                                disabled={alreadySent || actionLoading === user.uid}
                                onClick={() => handleSendRequest(user.uid)}
                              >
                                {actionLoading === user.uid ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : alreadySent ? (
                                  t('connections.requested')
                                ) : (
                                  <>
                                    <UserPlus className="w-3 h-3 mr-1 inline" />
                                    {t('connections.follow')}
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Suggested For You */}
              {!searchMode && suggestions.length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-[#5D2A42]/10 shadow-sm flex flex-col gap-4 conn-fade-up conn-stagger-3">
                  <div className="flex items-center justify-between border-b border-[#5D2A42]/5 pb-3">
                    <h3 className="font-extrabold text-[#5D2A42] flex items-center gap-2 text-sm sm:text-base">
                      <Sparkles className="w-4.5 h-4.5 text-[#FB6376]" />
                      {t('connections.suggestedForYou')}
                    </h3>
                    <button 
                      onClick={loadSuggestions} 
                      disabled={suggestionsLoading} 
                      className="p-1.5 text-[#5D2A42]/50 hover:text-[#5D2A42] hover:bg-[#5D2A42]/5 rounded-lg transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${suggestionsLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  
                  <div className="space-y-3.5">
                    {suggestionsLoading ? (
                      [...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 py-1.5">
                          <div className="w-9 h-9 rounded-full bg-[#5D2A42]/10" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-2.5 bg-[#5D2A42]/10 rounded-full w-24" />
                            <div className="h-2 bg-[#5D2A42]/10 rounded-full w-16" />
                          </div>
                        </div>
                      ))
                    ) : (
                      suggestions.slice(0, 5).map((user) => {
                        const alreadySent = sentRequests.has(user.uid);
                        return (
                          <div key={user.uid} className="flex items-center justify-between gap-2 py-0.5 group">
                            <div 
                              className="flex items-center gap-3 min-w-0 cursor-pointer" 
                              onClick={() => navigate(`/profile/${user.uid}`)}
                            >
                              <Avatar className="w-9 h-9 flex-shrink-0 border border-[#5D2A42]/10 group-hover:border-[#FB6376]/35 transition-colors duration-300 shadow-sm">
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-[10px] font-bold">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[#5D2A42] text-xs truncate group-hover:text-[#FB6376] transition-colors duration-300">{user.name}</p>
                                <p className="text-[10px] text-[#5D2A42]/50 truncate font-mono">
                                  {user.username ? `@${user.username}` : user.email}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-8 w-8 p-0 rounded-full transition-all ${
                                alreadySent 
                                  ? "bg-[#5D2A42]/5 text-[#5D2A42]/40 cursor-default" 
                                  : "bg-[#FFF9EC] text-[#5D2A42] hover:bg-[#5D2A42] hover:text-white"
                              }`}
                              disabled={alreadySent || actionLoading === user.uid}
                              onClick={() => handleSendRequest(user.uid)}
                            >
                              {actionLoading === user.uid ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : alreadySent ? (
                                <UserCheck className="w-4 h-4 text-[#5D2A42]/60" />
                              ) : (
                                <UserPlus className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Connections;
