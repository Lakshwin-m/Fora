import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Navigation from "@/components/Navigation";
import { Search, Loader2, ArrowRight, UserCheck, UserPlus, X, Sparkles } from "lucide-react";
import { apiSearchUsers, apiGetFriends, apiGetPendingRequests } from "@/services/friendServices";
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

/* ================= TYPES ================= */

type Relation = "friend" | "pending" | "none";

interface UserItem {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  username?: string;
  relation: Relation;
  score?: number; // Used for fuzzy sorting
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

/* ================= FUZZY SEARCH LOGIC ================= */

function fuzzyScore(query: string, text: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  
  if (t === q) return 100;
  if (t.startsWith(q)) return 50 + q.length;
  if (t.includes(q)) return 20 + q.length;

  let qIdx = 0;
  let score = 0;
  let consecutiveMatches = 0;

  for (let i = 0; i < t.length; i++) {
    if (qIdx < q.length && t[i] === q[qIdx]) {
      qIdx++;
      consecutiveMatches++;
      score += consecutiveMatches * 2;
    } else {
      consecutiveMatches = 0;
    }
  }

  if (qIdx === q.length) {
    return 10 + score;
  }
  return 0;
}

/* ================= COMPONENT ================= */

const Connections = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [authReady, setAuthReady] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Unified data store for all users we know about
  const [knownUsers, setKnownUsers] = useState<Map<string, UserItem>>(new Map());
  
  // Search state
  const [query, setQuery] = useState("");
  const [apiSearching, setApiSearching] = useState(false);

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
    loadInitialData();
  }, [authReady]);

  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [friendsData, pendingData, suggestionsData] = await Promise.all([
        apiGetFriends().catch(() => []),
        apiGetPendingRequests().catch(() => []),
        apiSearchUsers("SUGGESTIONS_TRIGGER").catch(() => []),
      ]);

      const newKnown = new Map<string, UserItem>();
      const currentUid = auth.currentUser?.uid;

      // Add Friends
      (friendsData || []).forEach((f: any) => {
        if (!f.profile || f.profile.uid === currentUid) return;
        newKnown.set(f.profile.uid, { ...f.profile, relation: "friend" });
      });

      // Add Pending
      (pendingData || []).forEach((p: any) => {
        if (!p.senderUid || p.senderUid === currentUid) return;
        if (!newKnown.has(p.senderUid)) {
          newKnown.set(p.senderUid, { 
            uid: p.senderUid,
            name: p.senderName,
            email: p.senderEmail,
            photoURL: p.senderPhotoURL,
            relation: "pending" 
          });
        }
      });

      // Add Suggestions
      (suggestionsData || []).forEach((s: any) => {
        if (!s.uid || s.uid === currentUid) return;
        if (!newKnown.has(s.uid)) {
          newKnown.set(s.uid, { ...s, relation: "none" });
        }
      });

      setKnownUsers(newKnown);
    } catch (err) {
      console.error("Error loading connections data", err);
    } finally {
      setLoadingInitial(false);
    }
  };

  /* ================= SEARCH EFFECT ================= */
  
  useEffect(() => {
    if (!query.trim() || !authReady) return;

    const timer = setTimeout(async () => {
      setApiSearching(true);
      try {
        const results = await apiSearchUsers(query.trim());
        const currentUid = auth.currentUser?.uid;
        
        setKnownUsers((prev) => {
          const next = new Map(prev);
          (results || []).forEach((r: any) => {
            if (!r.uid || r.uid === currentUid) return;
            if (!next.has(r.uid)) {
              next.set(r.uid, { ...r, relation: "none" });
            }
          });
          return next;
        });
      } catch (err) {
        console.error("API search error", err);
      } finally {
        setApiSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, authReady]);

  /* ================= DERIVED RESULTS ================= */
  
  const results = useMemo(() => {
    const all = Array.from(knownUsers.values());
    
    if (!query.trim()) {
      // Empty state: show friends first, then pending, then suggestions, limited to 15
      return all
        .sort((a, b) => {
          const weight = (r: Relation) => (r === "friend" ? 3 : r === "pending" ? 2 : 1);
          return weight(b.relation) - weight(a.relation);
        })
        .slice(0, 15);
    }

    const matches = all.map(u => {
      const textToSearch = `${u.name || ''} ${u.username || ''} ${u.email || ''}`;
      const score = fuzzyScore(query.trim(), textToSearch);
      return { ...u, score };
    }).filter(u => (u.score as number) > 0);

    return matches.sort((a, b) => (b.score as number) - (a.score as number));
  }, [query, knownUsers]);


  /* ================= RENDER ================= */

  if (!authReady) return null;

  return (
    <div className="min-h-screen bg-[#FFF9EC] relative overflow-hidden font-sans">
      <Navigation />
      
      {/* Decorative background elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-[#FB6376]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tl from-[#5D2A42]/5 to-transparent blur-3xl pointer-events-none" />

      <main className="ml-0 md:ml-20 flex flex-col items-center pt-16 md:pt-24 px-4 pb-24 relative z-10">
        <motion.div 
           initial={{ opacity: 0, y: -20 }} 
           animate={{ opacity: 1, y: 0 }} 
           transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
           className="w-full max-w-2xl relative"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#5D2A42] tracking-tight mb-3">
              Find People
            </h1>
            <p className="text-[#5D2A42]/60 font-medium text-lg max-w-md mx-auto">
              Search by name, username, or email to connect with the community.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative group z-20">
             <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[#5D2A42]/30 group-focus-within:text-[#FB6376] transition-colors duration-300" />
             <Input
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               placeholder="Search..."
               className="w-full h-16 md:h-20 pl-16 pr-14 text-lg md:text-xl bg-white/70 backdrop-blur-xl border-2 border-[#5D2A42]/10 rounded-3xl shadow-[0_8px_30px_rgb(93,42,66,0.04)] focus:border-[#FB6376]/40 focus:bg-white focus:shadow-[0_8px_40px_rgb(251,99,118,0.12)] transition-all duration-500 placeholder:text-[#5D2A42]/30 text-[#5D2A42] font-bold"
             />
             {query && (
               <button 
                 onClick={() => setQuery("")} 
                 className="absolute right-6 top-1/2 -translate-y-1/2 p-1.5 bg-[#5D2A42]/5 hover:bg-[#5D2A42]/10 text-[#5D2A42]/50 hover:text-[#5D2A42] rounded-full transition-colors"
               >
                 <X className="w-4 h-4 md:w-5 md:h-5" />
               </button>
             )}
          </div>

          {/* Results Area */}
          <div className="mt-8 w-full space-y-3 relative z-10">
             
             {!query && results.length > 0 && !loadingInitial && (
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 className="flex items-center gap-2 mb-4 pl-2 text-[#5D2A42]/50 text-sm font-bold uppercase tracking-wider"
               >
                 <Sparkles className="w-4 h-4 text-[#FB6376]" />
                 Suggested & Network
               </motion.div>
             )}

             {loadingInitial && !query ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#FB6376]/50 animate-spin" />
                </div>
             ) : (
               <AnimatePresence mode="popLayout">
                  {results.map((user, idx) => (
                     <motion.div
                       layout
                       key={user.uid}
                       initial={{ opacity: 0, y: 15, scale: 0.98 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                       transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: idx * 0.03 }}
                       onClick={() => navigate(`/profile/${user.uid}`)}
                       className="flex items-center gap-4 p-4 md:p-5 bg-white/60 backdrop-blur-md rounded-[24px] border border-[#5D2A42]/5 hover:border-[#FB6376]/30 hover:bg-white hover:shadow-[0_8px_30px_rgb(93,42,66,0.06)] cursor-pointer transition-all duration-300 group"
                     >
                       <Avatar className="w-14 h-14 md:w-16 md:h-16 border-2 border-transparent group-hover:border-[#FB6376]/20 transition-all duration-300 shadow-sm">
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback className="bg-gradient-to-br from-[#FFDCCC] to-[#FCB1A6] text-[#5D2A42] font-extrabold text-lg">
                            {getInitials(user.name)}
                          </AvatarFallback>
                       </Avatar>
                       <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-[#5D2A42] text-lg md:text-xl group-hover:text-[#FB6376] transition-colors truncate">
                             {user.name}
                          </h3>
                          <p className="text-[#5D2A42]/50 text-sm md:text-base truncate font-mono font-medium mt-0.5">
                             {user.username ? `@${user.username}` : user.email}
                          </p>
                       </div>
                       
                       {/* Badges */}
                       <div className="hidden sm:flex items-center gap-2">
                         {user.relation === "friend" && (
                            <div className="px-3 py-1.5 bg-[#5D2A42]/5 text-[#5D2A42] rounded-xl text-xs font-bold flex items-center gap-1.5">
                               <UserCheck className="w-3.5 h-3.5" /> Friends
                            </div>
                         )}
                         {user.relation === "pending" && (
                            <div className="px-3 py-1.5 bg-[#FB6376]/10 text-[#FB6376] rounded-xl text-xs font-bold flex items-center gap-1.5">
                               <UserPlus className="w-3.5 h-3.5" /> Pending
                            </div>
                         )}
                       </div>

                       <div className="w-10 h-10 rounded-full bg-[#5D2A42]/5 flex items-center justify-center text-[#5D2A42]/40 group-hover:bg-[#FB6376] group-hover:text-white group-active:scale-95 transition-all duration-300 ml-2 shadow-sm">
                          <ArrowRight className="w-4.5 h-4.5" />
                       </div>
                     </motion.div>
                  ))}
               </AnimatePresence>
             )}

             {results.length === 0 && query && !apiSearching && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }} 
                 animate={{ opacity: 1, y: 0 }} 
                 className="text-center py-16"
               >
                 <div className="w-20 h-20 bg-white rounded-[2rem] mx-auto flex items-center justify-center border border-[#5D2A42]/10 mb-6 shadow-sm">
                    <Search className="w-8 h-8 text-[#5D2A42]/20" />
                 </div>
                 <h3 className="text-xl font-bold text-[#5D2A42] mb-2">No results found</h3>
                 <p className="text-[#5D2A42]/50 font-medium">We couldn't find anyone matching "{query}"</p>
               </motion.div>
             )}

             {apiSearching && results.length === 0 && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-12">
                 <Loader2 className="w-8 h-8 text-[#FB6376] animate-spin" />
               </motion.div>
             )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Connections;
