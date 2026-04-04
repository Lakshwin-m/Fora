import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock,
  Send,
  X,
  Inbox,
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

/* ================= TYPES ================= */

interface UserProfile {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
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
}

interface SearchResult {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
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

/* ================= COMPONENT ================= */

const Connections = () => {
  const navigate = useNavigate();

  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("connections");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // My Connections
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [debouncedFriendSearch, setDebouncedFriendSearch] = useState("");

  // Pending
  const [pending, setPending] = useState<PendingRequest[]>([]);

  // Find People
  const [peopleQuery, setPeopleQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

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
        title: "Error",
        description: "Failed to load connections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ================= DEBOUNCED FRIEND FILTER ================= */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedFriendSearch(friendSearch.toLowerCase());
    }, 300);
    return () => clearTimeout(t);
  }, [friendSearch]);

  const filteredFriends = debouncedFriendSearch
    ? friends.filter(
        (f) =>
          f.profile?.name?.toLowerCase().includes(debouncedFriendSearch) ||
          f.profile?.email?.toLowerCase().includes(debouncedFriendSearch)
      )
    : friends;

  /* ================= FIND PEOPLE SEARCH ================= */
  const handlePeopleSearch = async () => {
    if (!peopleQuery.trim()) return;
    setSearching(true);
    try {
      const results = await apiSearchUsers(peopleQuery.trim());
      // Filter out users who are already friends
      const friendUids = new Set(friends.map((f) => f.profile?.uid));
      const currentUid = auth.currentUser?.uid;
      const filtered = (results || []).filter(
        (r: SearchResult) => r.uid !== currentUid && !friendUids.has(r.uid)
      );
      setSearchResults(filtered);
    } catch {
      toast({
        title: "Search failed",
        description: "Could not search for users",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (uid: string) => {
    setActionLoading(uid);
    try {
      await apiSendFriendRequest(uid);
      setSentRequests((prev) => new Set(prev).add(uid));
      toast({ title: "Request sent!" });
    } catch {
      toast({
        title: "Failed to send request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  /* ================= ACTIONS ================= */
  const handleRemove = async (id: string) => {
    setActionLoading(id);
    try {
      await apiRemoveFriend(id);
      toast({ title: "Connection removed" });
      await loadAll();
    } catch {
      toast({
        title: "Failed to remove connection",
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
      toast({ title: "Connection accepted!" });
      await loadAll();
    } catch {
      toast({
        title: "Failed to accept request",
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
      toast({ title: "Request declined" });
      await loadAll();
    } catch {
      toast({
        title: "Failed to decline request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  /* ================= LOADING ================= */
  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-[#FFF9EC]">
        <Navigation />
        <main className="ml-0 md:ml-20">
          <div className="flex justify-center items-center h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto border-4 border-[#FB6376] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#5D2A42] text-base">Loading connections…</p>
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
          {/* ===== HEADER ===== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold text-[#1A1A1A] mb-1">
                Connections
              </h1>
              <p className="text-[#666666] text-sm">
                Manage your network and discover new people
              </p>
            </div>

            {/* Stats pills */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E8E8] rounded-xl">
                <Users className="w-4 h-4 text-[#FB6376]" />
                <span className="text-sm font-semibold text-[#1A1A1A]">
                  {friends.length}
                </span>
                <span className="text-sm text-[#999]">connected</span>
              </div>
              {pending.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#FB6376]/20 rounded-xl">
                  <Clock className="w-4 h-4 text-[#FB6376]" />
                  <span className="text-sm font-semibold text-[#FB6376]">
                    {pending.length}
                  </span>
                  <span className="text-sm text-[#999]">pending</span>
                </div>
              )}
            </div>
          </div>

          {/* ===== TABS ===== */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full sm:w-auto mb-10 bg-white border border-[#E8E8E8] p-1.5 rounded-xl">
              <TabsTrigger
                value="connections"
                className="flex-1 sm:flex-none data-[state=active]:bg-[#FB6376] data-[state=active]:text-white px-6 py-2.5 rounded-lg text-sm"
              >
                <Users className="w-4 h-4 mr-2" />
                My Connections
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="flex-1 sm:flex-none data-[state=active]:bg-[#FCB1A6] data-[state=active]:text-[#1A1A1A] px-6 py-2.5 rounded-lg text-sm relative"
              >
                <Inbox className="w-4 h-4 mr-2" />
                Pending
                {pending.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-[#FB6376] text-white rounded-full">
                    {pending.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="find"
                className="flex-1 sm:flex-none data-[state=active]:bg-[#5D2A42] data-[state=active]:text-white px-6 py-2.5 rounded-lg text-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Find People
              </TabsTrigger>
            </TabsList>

            {/* ===== TAB: MY CONNECTIONS ===== */}
            <TabsContent value="connections">
              {/* Search */}
              <div className="relative mb-8 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                <Input
                  className="pl-10 bg-white border-[#E8E8E8] rounded-xl h-11 text-sm placeholder:text-[#999]"
                  placeholder="Search your connections…"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                />
                {friendSearch && (
                  <button
                    onClick={() => setFriendSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#666]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {filteredFriends.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-white border border-[#E8E8E8] rounded-2xl flex items-center justify-center">
                    <Users className="w-10 h-10 text-[#CCBBBB]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">
                    {friendSearch
                      ? "No matches found"
                      : "No connections yet"}
                  </h3>
                  <p className="text-[#999] text-sm max-w-sm mx-auto mb-6">
                    {friendSearch
                      ? "Try a different search term"
                      : "Start building your network by finding people to connect with"}
                  </p>
                  {!friendSearch && (
                    <Button
                      onClick={() => setActiveTab("find")}
                      className="bg-[#FB6376] hover:bg-[#e8556a] text-white px-6 h-10 text-sm rounded-xl"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Find People
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredFriends.map((f) => (
                    <Card
                      key={f.id}
                      className="border border-[#E8E8E8] bg-white hover:border-[#FB6376]/30 transition-colors duration-200 rounded-xl overflow-hidden"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar className="w-11 h-11 flex-shrink-0 border border-[#E8E8E8]">
                              <AvatarImage src={f.profile?.photoURL} />
                              <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-sm font-semibold">
                                {getInitials(f.profile?.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1A1A1A] text-sm truncate">
                                {f.profile?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-[#999] truncate">
                                {f.profile?.email}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#999] hover:text-[#FB6376] hover:bg-[#FB6376]/5 h-9 w-9 p-0 rounded-lg flex-shrink-0"
                            disabled={actionLoading === f.id}
                            onClick={() => handleRemove(f.id)}
                            title="Remove connection"
                          >
                            {actionLoading === f.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserMinus className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ===== TAB: PENDING REQUESTS ===== */}
            <TabsContent value="pending">
              {pending.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-white border border-[#E8E8E8] rounded-2xl flex items-center justify-center">
                    <Inbox className="w-10 h-10 text-[#CCBBBB]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">
                    All caught up
                  </h3>
                  <p className="text-[#999] text-sm max-w-sm mx-auto">
                    No pending connection requests right now
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-w-2xl">
                  {pending.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 bg-white border border-[#E8E8E8] rounded-xl hover:border-[#FB6376]/20 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="w-10 h-10 flex-shrink-0 border border-[#E8E8E8]">
                          <AvatarImage src={p.senderPhotoURL} />
                          <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-xs font-semibold">
                            {getInitials(p.senderName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1A1A1A] text-sm truncate">
                            {p.senderName || "Unknown"}
                          </p>
                          <p className="text-xs text-[#999] truncate">
                            {p.senderEmail}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Button
                          size="sm"
                          className="bg-[#FB6376] hover:bg-[#e8556a] text-white h-9 px-4 rounded-lg text-xs font-medium"
                          disabled={actionLoading === p.id}
                          onClick={() => handleAccept(p.id)}
                        >
                          {actionLoading === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                              Accept
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#999] hover:text-[#FB6376] hover:bg-[#FB6376]/5 h-9 px-3 rounded-lg text-xs"
                          disabled={actionLoading === p.id}
                          onClick={() => handleReject(p.id)}
                        >
                          <UserX className="w-3.5 h-3.5 mr-1.5" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ===== TAB: FIND PEOPLE ===== */}
            <TabsContent value="find">
              {/* Search bar */}
              <div className="flex items-center gap-3 mb-8 max-w-lg">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                  <Input
                    className="pl-10 bg-white border-[#E8E8E8] rounded-xl h-11 text-sm placeholder:text-[#999]"
                    placeholder="Search by name or email…"
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePeopleSearch()}
                  />
                </div>
                <Button
                  onClick={handlePeopleSearch}
                  disabled={searching || !peopleQuery.trim()}
                  className="bg-[#5D2A42] hover:bg-[#4a2135] text-white h-11 px-5 rounded-xl text-sm"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {/* Results */}
              {searchResults.length === 0 && !searching ? (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-white border border-[#E8E8E8] rounded-2xl flex items-center justify-center">
                    <Search className="w-10 h-10 text-[#CCBBBB]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">
                    Discover people
                  </h3>
                  <p className="text-[#999] text-sm max-w-sm mx-auto">
                    Search by name or email to find and connect with others on
                    Forá
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {searchResults.map((user) => {
                    const alreadySent = sentRequests.has(user.uid);
                    return (
                      <Card
                        key={user.uid}
                        className="border border-[#E8E8E8] bg-white rounded-xl overflow-hidden"
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <Avatar className="w-11 h-11 flex-shrink-0 border border-[#E8E8E8]">
                              <AvatarImage src={user.photoURL} />
                              <AvatarFallback className="bg-[#FFDCCC] text-[#5D2A42] text-sm font-semibold">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1A1A1A] text-sm truncate">
                                {user.name || "Unknown"}
                              </p>
                              <p className="text-xs text-[#999] truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className={`w-full h-9 rounded-lg text-xs font-medium ${
                              alreadySent
                                ? "bg-[#F0F0F0] text-[#999] cursor-default hover:bg-[#F0F0F0]"
                                : "bg-[#FB6376] hover:bg-[#e8556a] text-white"
                            }`}
                            disabled={
                              alreadySent || actionLoading === user.uid
                            }
                            onClick={() => handleSendRequest(user.uid)}
                          >
                            {actionLoading === user.uid ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : alreadySent ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                                Request Sent
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                Connect
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Connections;
