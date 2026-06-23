import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";
import { toast } from "@/hooks/use-toast";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { apiSearchUsers, apiGetFriends } from "@/services/friendServices";
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/contexts/LanguageContext";

interface SearchResult {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  username?: string;
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

const Connections = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [authReady, setAuthReady] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [friendsData, setFriendsData] = useState<any[]>([]);

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
    loadSuggestions();
  }, [authReady]);

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const [results, fData] = await Promise.all([
        apiSearchUsers("SUGGESTIONS_TRIGGER"),
        apiGetFriends()
      ]);
      setFriendsData(fData || []);
      const currentUid = auth.currentUser?.uid;
      const friendUids = new Set((fData || []).map((f: any) => f.profile?.uid));

      const filtered = (results || []).filter(
        (r: SearchResult) => r.uid !== currentUid && !friendUids.has(r.uid)
      );
      setSuggestions(filtered.slice(0, 12));
    } catch {
      // Silently fail
    } finally {
      setSuggestionsLoading(false);
    }
  };

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
      const friendUids = new Set(friendsData.map((f: any) => f.profile?.uid));
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
  }, [globalQuery, friendsData, t]);

  const ResultRow = ({ user }: { user: SearchResult }) => (
    <div 
      onClick={() => navigate(`/profile/${user.uid}`)}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-[#5D2A42]/10 hover:border-[#FB6376]/50 hover:shadow-sm cursor-pointer transition-all duration-300 group"
    >
      <Avatar className="w-12 h-12 flex-shrink-0 border-2 border-transparent group-hover:border-[#FB6376]/20 transition-colors duration-300">
        <AvatarImage src={user.photoURL} />
        <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] font-bold">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#5D2A42] truncate group-hover:text-[#FB6376] transition-colors">{user.name}</p>
        <p className="text-sm text-[#5D2A42]/60 truncate font-mono">
          {user.username ? `@${user.username}` : user.email}
        </p>
      </div>
      <ArrowRight className="w-5 h-5 text-[#5D2A42]/20 group-hover:text-[#FB6376] transition-colors" />
    </div>
  );

  if (!authReady) return null;

  return (
    <div className="min-h-screen bg-[#FFF9EC]">
      <Navigation />
      <main className="ml-0 md:ml-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#5D2A42] tracking-tight mb-3">
              {t('nav.search') || 'Search'}
            </h1>
            <p className="text-[#5D2A42]/70 text-sm sm:text-base font-medium max-w-md mx-auto">
              Find friends and discover new capsules
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-12 shadow-sm rounded-2xl group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5D2A42]/40 group-focus-within:text-[#FB6376] transition-colors" />
            <Input
              className="pl-14 pr-14 bg-white border-none rounded-2xl h-16 text-lg placeholder:text-[#5D2A42]/30 focus-visible:ring-2 focus-visible:ring-[#FB6376]/20 focus-visible:ring-offset-0 transition-all duration-300"
              placeholder="Search by name or username..."
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
            {searching && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 text-[#FB6376] animate-spin" />
              </div>
            )}
          </div>

          {/* Results Area */}
          <div>
            {searchMode ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-sm font-extrabold text-[#5D2A42]/60 uppercase tracking-wider mb-4 px-2">
                  Search Results
                </h2>
                {searchResults.length === 0 && !searching ? (
                  <div className="text-center py-10">
                    <p className="text-[#5D2A42]/60 italic">No users found for "{globalQuery}"</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {searchResults.map(user => <ResultRow key={user.uid} user={user} />)}
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in duration-500">
                <h2 className="text-sm font-extrabold text-[#5D2A42]/60 uppercase tracking-wider mb-4 px-2">
                  Suggestions For You
                </h2>
                {suggestionsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-[#FB6376] animate-spin" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-[#5D2A42]/60 italic">No suggestions right now</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {suggestions.map(user => <ResultRow key={user.uid} user={user} />)}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default Connections;
