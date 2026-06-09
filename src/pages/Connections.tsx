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
  <div className="animate-pulse flex items-center gap-4 p-4 rounded-2xl bg-white/60 border border-[#E8E8E8]">
    <div className="w-12 h-12 rounded-full bg-[#F0E8E4]" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 bg-[#F0E8E4] rounded-full w-28" />
      <div className="h-3 bg-[#F0E8E4] rounded-full w-40" />
    </div>
    <div className="h-8 w-20 bg-[#F0E8E4] rounded-lg" />
  </div>
);

const SkeletonSuggestion = () => (
  <div className="animate-pulse flex-shrink-0 w-[180px] p-5 rounded-2xl bg-white/60 border border-[#E8E8E8]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-full bg-[#F0E8E4]" />
      <div className="h-3.5 bg-[#F0E8E4] rounded-full w-24" />
      <div className="h-3 bg-[#F0E8E4] rounded-full w-20" />
      <div className="h-8 w-full bg-[#F0E8E4] rounded-lg mt-1" />
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
    @keyframes conn-slide-down {
      from { opacity: 0; max-height: 0; padding-top: 0; padding-bottom: 0; margin-bottom: 0; }
      to { opacity: 1; max-height: 500px; }
    }
    @keyframes conn-pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(251, 99, 118, 0.4); }
      70% { box-shadow: 0 0 0 8px rgba(251, 99, 118, 0); }
      100% { box-shadow: 0 0 0 0 rgba(251, 99, 118, 0); }
    }
    @keyframes conn-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .conn-fade-up {
      animation: conn-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      opacity: 0;
    }
    .conn-slide-down {
      animation: conn-slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      overflow: hidden;
    }
    .conn-pulse-ring {
      animation: conn-pulse-ring 2s ease-in-out infinite;
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

  /* ---- Search ---- */
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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
      // Use a few common queries to get a mix of users
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
      // Silently fail — suggestions are non-critical
      console.log("Suggestions unavailable");
    } finally {
      setSuggestionsLoading(false);
    }
  };

  /* ================= DEBOUNCED LOCAL FILTER ================= */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery.toLowerCase());
    }, 250);
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

  /* ================= API SEARCH ================= */
  const handleGlobalSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchMode(false);
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setSearchMode(true);
    try {
      const results = await apiSearchUsers(searchQuery.trim());
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
  }, [searchQuery, friends]);

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
    setSearchQuery("");
    setSearchMode(false);
    setSearchResults([]);
  };

  /* ================= LOADING STATE ================= */
  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <main className="ml-0 md:ml-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Skeleton header */}
            <div className="animate-pulse mb-10">
              <div className="h-8 bg-[#F0E8E4] rounded-xl w-48 mb-3" />
              <div className="h-4 bg-[#F0E8E4] rounded-lg w-64 mb-6" />
              <div className="flex gap-3">
                <div className="h-10 bg-[#F0E8E4] rounded-xl w-32" />
                <div className="h-10 bg-[#F0E8E4] rounded-xl w-32" />
              </div>
            </div>

            {/* Skeleton search */}
            <div className="animate-pulse mb-8">
              <div className="h-12 bg-[#F0E8E4] rounded-2xl w-full max-w-xl" />
            </div>

            {/* Skeleton suggestions */}
            <div className="mb-10">
              <div className="animate-pulse h-5 bg-[#F0E8E4] rounded-lg w-36 mb-4" />
              <div className="flex gap-4 overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <SkeletonSuggestion key={i} />
                ))}
              </div>
            </div>

            {/* Skeleton connections */}
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* ========== HEADER ========== */}
          <div className="conn-fade-up mb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] tracking-tight mb-1">
                  {t('connections.title')}
                </h1>
                <p className="text-[#888] text-sm">
                  {t('connections.subtitle')}
                </p>
              </div>

              {/* Stats pills */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setActiveList("following")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                    activeList === "following"
                      ? "bg-[#FB6376] text-white shadow-lg shadow-[#FB6376]/20"
                      : "bg-white text-[#1A1A1A] border border-[#E8E8E8] hover:border-[#FB6376]/30"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="tabular-nums">{friends.length}</span>
                  <span className="opacity-80">{t('connections.following')}</span>
                </button>

                <button
                  onClick={() => setActiveList("followers")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                    activeList === "followers"
                      ? "bg-[#5D2A42] text-white shadow-lg shadow-[#5D2A42]/20"
                      : "bg-white text-[#1A1A1A] border border-[#E8E8E8] hover:border-[#5D2A42]/30"
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span className="tabular-nums">{friends.length}</span>
                  <span className="opacity-80">{t('connections.followers')}</span>
                </button>

                {pending.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FB6376]/10 border border-[#FB6376]/20 rounded-2xl conn-pulse-ring">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FB6376] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FB6376]" />
                    </span>
                    <span className="text-sm font-semibold text-[#FB6376] tabular-nums">
                      {pending.length}
                    </span>
                    <span className="text-sm text-[#FB6376]/80">
                      {pending.length === 1 ? t('connections.request') : t('connections.requests')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========== PENDING REQUESTS BANNER ========== */}
          {pending.length > 0 && (
            <div className="conn-slide-down mb-8">
              <div className="bg-gradient-to-r from-[#FB6376]/5 via-[#FCB1A6]/10 to-[#FFDCCC]/10 border border-[#FB6376]/15 rounded-2xl overflow-hidden">
                {/* Banner header */}
                <button
                  onClick={() => setPendingExpanded(!pendingExpanded)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FB6376]/5 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FB6376] flex items-center justify-center">
                      <UserPlus className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        {t('connections.followRequests')}
                      </p>
                      <p className="text-xs text-[#888]">
                        {pending.length} {pending.length === 1 ? t('connections.wantsToConnectSingle') : t('connections.wantsToConnectPlural')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Stacked avatars preview */}
                    <div className="flex -space-x-2 mr-2">
                      {pending.slice(0, 3).map((p, i) => (
                        <Avatar
                          key={p.id}
                          className="w-7 h-7 border-2 border-white"
                          style={{ zIndex: 3 - i }}
                        >
                          <AvatarImage src={p.senderPhotoURL} />
                          <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-[10px] font-semibold">
                            {getInitials(p.senderName)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {pending.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-[#FB6376] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                          +{pending.length - 3}
                        </div>
                      )}
                    </div>
                    {pendingExpanded ? (
                      <ChevronUp className="w-4.5 h-4.5 text-[#999]" />
                    ) : (
                      <ChevronDown className="w-4.5 h-4.5 text-[#999]" />
                    )}
                  </div>
                </button>

                {/* Expanded list */}
                {pendingExpanded && (
                  <div className="px-5 pb-4 space-y-2.5">
                    {pending.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`conn-fade-up conn-stagger-${Math.min(idx + 1, 9)} flex items-center justify-between p-3.5 bg-white rounded-xl border border-[#E8E8E8] hover:border-[#FB6376]/25 transition-all duration-200`}
                      >
                        <div 
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group/item"
                          onClick={() => navigate(`/profile/${p.senderUid}`)}
                        >
                          <Avatar className="w-10 h-10 flex-shrink-0 border border-[#E8E8E8] group-hover/item:border-[#FB6376]/30 transition-colors">
                            <AvatarImage src={p.senderPhotoURL} />
                            <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-xs font-semibold">
                              {getInitials(p.senderName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1A1A1A] text-sm truncate group-hover/item:text-[#FB6376] transition-colors">
                              {p.senderName || "Unknown"}
                            </p>
                            <p className="text-xs text-[#999] truncate">
                              {p.senderEmail}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <Button
                            size="sm"
                            className="bg-[#FB6376] hover:bg-[#e8556a] text-white h-8 px-4 rounded-xl text-xs font-semibold shadow-sm shadow-[#FB6376]/20"
                            disabled={actionLoading === p.id}
                            onClick={() => handleAccept(p.id)}
                          >
                            {actionLoading === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                                {t('connections.accept')}
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#999] hover:text-[#FB6376] hover:bg-[#FB6376]/5 h-8 w-8 p-0 rounded-xl"
                            disabled={actionLoading === p.id}
                            onClick={() => handleReject(p.id)}
                            title="Decline"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== SEARCH BAR ========== */}
          <div className="conn-fade-up conn-stagger-2 mb-10">
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#AAAAAA]" />
              <Input
                className="pl-11 pr-24 bg-white border-[#E8E8E8] rounded-2xl h-12 text-sm placeholder:text-[#BBBBBB] shadow-sm focus:shadow-md focus:border-[#FB6376]/40 transition-all duration-300"
                placeholder={t('connections.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) {
                    setSearchMode(false);
                    setSearchResults([]);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="p-1.5 text-[#999] hover:text-[#666] rounded-lg hover:bg-[#F5F5F5] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <Button
                  size="sm"
                  onClick={handleGlobalSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-[#5D2A42] hover:bg-[#4a2135] text-white h-8 px-3.5 rounded-xl text-xs font-semibold"
                >
                  {searching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-3 h-3 mr-1" />
                      {t('connections.find')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* ========== SEARCH RESULTS (when in search mode) ========== */}
          {searchMode && (
            <div className="conn-fade-up mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  {t('connections.searchResults')}
                </h2>
                <button
                  onClick={clearSearch}
                  className="text-xs text-[#FB6376] font-semibold hover:underline"
                >
                  {t('connections.clearSearch')}
                </button>
              </div>

              {searchResults.length === 0 && !searching ? (
                <div className="py-12 text-center bg-white rounded-2xl border border-[#E8E8E8]">
                  <div className="w-14 h-14 mx-auto mb-4 bg-[#FFF4F2] rounded-2xl flex items-center justify-center">
                    <Search className="w-7 h-7 text-[#CCBBBB]" />
                  </div>
                  <p className="text-[#999] text-sm">
                    {t('connections.noUsersFound')} "<span className="font-medium text-[#666]">{searchQuery}</span>"
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {searchResults.map((user, idx) => {
                    const alreadySent = sentRequests.has(user.uid);
                    return (
                      <div
                        key={user.uid}
                        className={`conn-fade-up conn-stagger-${Math.min(idx + 1, 9)} flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#FB6376]/20 hover:shadow-sm transition-all duration-200`}
                      >
                        <div 
                          className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer group/item"
                          onClick={() => navigate(`/profile/${user.uid}`)}
                        >
                          <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-[#F0E8E4] group-hover/item:border-[#FB6376]/30 transition-colors">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-sm font-semibold">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#1A1A1A] text-sm truncate group-hover/item:text-[#FB6376] transition-colors">
                              {user.name || "Unknown"}
                            </p>
                            <p className="text-xs text-[#999] truncate">
                              {user.username ? `@${user.username}` : user.email}
                            </p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className={`h-9 px-5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                            alreadySent
                              ? "bg-[#F5F5F5] text-[#999] cursor-default hover:bg-[#F5F5F5] border border-[#E8E8E8]"
                              : "bg-[#FB6376] hover:bg-[#e8556a] text-white shadow-sm shadow-[#FB6376]/20"
                          }`}
                          disabled={alreadySent || actionLoading === user.uid}
                          onClick={() => handleSendRequest(user.uid)}
                        >
                          {actionLoading === user.uid ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : alreadySent ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                              {t('connections.requested')}
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
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

          {/* ========== SUGGESTED FOR YOU ========== */}
          {!searchMode && suggestions.length > 0 && (
            <div className="conn-fade-up conn-stagger-3 mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-[#FB6376]" />
                  <h2 className="text-base font-bold text-[#1A1A1A]">
                    {t('connections.suggestedForYou')}
                  </h2>
                </div>
                <button
                  onClick={loadSuggestions}
                  disabled={suggestionsLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#FB6376] hover:text-[#e8556a] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${suggestionsLoading ? "animate-spin" : ""}`} />
                  {t('connections.refresh')}
                </button>
              </div>

              <div
                ref={suggestionsRef}
                className="flex gap-3.5 overflow-x-auto pb-2 conn-hide-scrollbar"
              >
                {suggestionsLoading
                  ? [...Array(5)].map((_, i) => <SkeletonSuggestion key={i} />)
                  : suggestions.map((user, idx) => {
                      const alreadySent = sentRequests.has(user.uid);
                      return (
                        <div
                          key={user.uid}
                          className={`conn-fade-up conn-stagger-${Math.min(idx + 1, 9)} flex-shrink-0 w-[180px] p-5 rounded-2xl bg-white border border-[#E8E8E8] hover:border-[#FB6376]/25 hover:shadow-md transition-all duration-300 group`}
                        >
                          <div className="flex flex-col items-center text-center">
                            <div 
                              className="cursor-pointer group/avatar"
                              onClick={() => navigate(`/profile/${user.uid}`)}
                            >
                              <Avatar className="w-16 h-16 mb-3 border-2 border-[#F0E8E4] group-hover/avatar:border-[#FB6376]/30 transition-colors duration-300">
                                <AvatarImage src={user.photoURL} />
                                <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] text-lg font-semibold">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-semibold text-[#1A1A1A] text-sm truncate w-full mb-0.5 group-hover/avatar:text-[#FB6376] transition-colors">
                                {user.name || "Unknown"}
                              </p>
                            </div>
                            <p className="text-[11px] text-[#999] truncate w-full mb-3">
                              {user.username ? `@${user.username}` : user.email}
                            </p>
                            <Button
                              size="sm"
                              className={`w-full h-8 rounded-xl text-xs font-semibold transition-all duration-300 ${
                                alreadySent
                                  ? "bg-[#F5F5F5] text-[#999] hover:bg-[#F5F5F5] border border-[#E8E8E8]"
                                  : "bg-[#FB6376] hover:bg-[#e8556a] text-white shadow-sm shadow-[#FB6376]/20 hover:shadow-md hover:shadow-[#FB6376]/30"
                              }`}
                              disabled={alreadySent || actionLoading === user.uid}
                              onClick={() => handleSendRequest(user.uid)}
                            >
                              {actionLoading === user.uid ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : alreadySent ? (
                                <>
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  {t('connections.requested')}
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3 h-3 mr-1" />
                                  {t('connections.follow')}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
              </div>
            </div>
          )}

          {/* ========== CONNECTIONS LIST ========== */}
          {!searchMode && (
            <div className="conn-fade-up conn-stagger-4">
              {/* Section header with toggle */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-[#1A1A1A]">
                    {activeList === "following" ? t('connections.following') : t('connections.followers')}
                  </h2>
                  <span className="text-xs text-[#999] font-medium bg-[#F5F5F5] px-2.5 py-1 rounded-lg">
                    {filteredFriends.length}
                  </span>
                </div>

                {/* Mini toggle */}
                <div className="flex items-center bg-white border border-[#E8E8E8] rounded-xl p-1">
                  <button
                    onClick={() => setActiveList("following")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      activeList === "following"
                        ? "bg-[#FB6376] text-white shadow-sm"
                        : "text-[#999] hover:text-[#666]"
                    }`}
                  >
                    {t('connections.following')}
                  </button>
                  <button
                    onClick={() => setActiveList("followers")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      activeList === "followers"
                        ? "bg-[#5D2A42] text-white shadow-sm"
                        : "text-[#999] hover:text-[#666]"
                    }`}
                  >
                    {t('connections.followers')}
                  </button>
                </div>
              </div>

              {/* Connection cards */}
              {filteredFriends.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-[#FFF4F2] to-[#FFDCCC]/50 rounded-3xl flex items-center justify-center">
                    <Users className="w-9 h-9 text-[#CCBBBB]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">
                    {searchQuery ? t('connections.noMatches') : t('connections.noConnections')}
                  </h3>
                  <p className="text-[#999] text-sm max-w-sm mx-auto mb-6">
                    {searchQuery
                      ? t('connections.tryDifferentSearch')
                      : t('connections.startBuildingNetwork')}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => {
                        const searchInput = document.querySelector<HTMLInputElement>(
                          'input[placeholder*="Search connections"]'
                        );
                        searchInput?.focus();
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FB6376] hover:bg-[#e8556a] text-white text-sm font-semibold rounded-xl shadow-sm shadow-[#FB6376]/20 transition-all duration-200 hover:shadow-md hover:shadow-[#FB6376]/30"
                    >
                      <UserPlus className="w-4 h-4" />
                      {t('connections.findPeople')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredFriends.map((f, idx) => (
                    <div
                      key={f.id}
                      className={`conn-fade-up conn-stagger-${Math.min(idx + 1, 9)} flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E8E8E8] hover:border-[#FB6376]/20 hover:shadow-sm transition-all duration-200 group`}
                    >
                        <div 
                          className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer group/item"
                          onClick={() => navigate(`/profile/${f.profile?.uid}`)}
                        >
                          <div className="relative">
                            <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-[#F0E8E4] group-hover/item:border-[#FB6376]/30 transition-colors duration-300">
                              <AvatarImage src={f.profile?.photoURL} />
                              <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] text-sm font-semibold">
                                {getInitials(f.profile?.name)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#1A1A1A] text-sm truncate group-hover/item:text-[#FB6376] transition-colors">
                              {f.profile?.name || "Unknown"}
                            </p>
                            <p className="text-xs text-[#999] truncate">
                              {f.profile?.username ? `@${f.profile.username}` : f.profile?.email}
                            </p>
                          </div>
                        </div>

                      {/* Instagram-style Following/Unfollow button */}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <button
                          className={`h-9 px-4 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                            hoveredFriend === f.id
                              ? "bg-[#FFF4F2] border-[#FB6376]/30 text-[#FB6376]"
                              : "bg-[#F8F8F8] border-[#E8E8E8] text-[#666]"
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
                              <UserMinus className="w-3.5 h-3.5 mr-1.5 inline" />
                              {t('connections.unfollow')}
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 mr-1.5 inline" />
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
          )}
        </div>
      </main>
    </div>
  );
};

export default Connections;
