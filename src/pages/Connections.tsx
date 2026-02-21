import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import {
  Search,
  Users,
  MoreHorizontal,
  UserMinus,
  Loader2,
  ArrowLeft,
  Eye,
  MessageCircle,
} from "lucide-react";
import {
  apiGetFriends,
  apiGetPendingRequests,
  apiAcceptFriendRequest,
  apiRejectFriendRequest,
  apiRemoveFriend,
} from "@/services/friendServices";
import { auth } from "@/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

/* ================= COMPONENT ================= */

const Connections = () => {
  const navigate = useNavigate();

  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);

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
      setFilteredFriends(friendsData || []);
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

  /* ================= DEBOUNCED SEARCH ================= */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.toLowerCase());
    }, 300);

    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!debouncedSearch) {
      setFilteredFriends(friends);
      return;
    }

    const filtered = friends.filter(
      (f) =>
        f.profile?.name?.toLowerCase().includes(debouncedSearch) ||
        f.profile?.email?.toLowerCase().includes(debouncedSearch)
    );

    setFilteredFriends(filtered);
  }, [debouncedSearch, friends]);

  /* ================= HELPERS ================= */
  const getInitials = (name?: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "?";

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
      toast({ title: "Connection accepted" });
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
      toast({ title: "Request rejected" });
      await loadAll();
    } catch {
      toast({
        title: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  /* ================= LOADING ================= */
  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Dashboard
        </Button>

        <div className="flex items-center justify-between mb-10">
          <h1 className="text-4xl font-bold">Connections</h1>
          <Badge>{friends.length} people</Badge>
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <Search className="absolute left-3 top-3 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search connections"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Friends */}
        {filteredFriends.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Users className="mx-auto mb-4" />
              <p>No connections found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredFriends.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-5">
                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      <Avatar>
                        <AvatarImage src={f.profile?.photoURL} />
                        <AvatarFallback>
                          {getInitials(f.profile?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">
                          {f.profile?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {f.profile?.email}
                        </p>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageCircle className="w-4 h-4 mr-2" /> Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          disabled={actionLoading === f.id}
                          onClick={() => handleRemove(f.id)}
                        >
                          <UserMinus className="w-4 h-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pending Requests */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold mb-4">Pending Requests</h3>

          {pending.length === 0 ? (
            <p className="text-muted-foreground">No pending requests</p>
          ) : (
            pending.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center p-3 border rounded mb-2"
              >
                <span>{p.senderName || p.senderEmail}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAccept(p.id)}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(p.id)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Connections;
