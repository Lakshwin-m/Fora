import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Users,
  User,
  Settings,
  Plus,
  LogOut,
  Menu,
  X,
  Archive,
  Home,
  MessageSquare,
  Calendar,
  Box,
  Gift,
  Heart,
  Camera,
  Sparkles,
  ChevronRight,
  Fence,
  Globe,
  ArrowUpCircle,
  ExternalLink,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { usePlan } from "@/hooks/usePlan";
import { useTranslation } from "@/contexts/LanguageContext";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(location.pathname);
  const [userProfile, setUserProfile] = useState<{ photoURL?: string; displayName?: string } | null>(null);
  const { plan } = usePlan();
  const { t, language, setLanguage } = useTranslation();

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
  };

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserProfile({
          photoURL: user.photoURL || undefined,
          displayName: user.displayName || undefined,
        });

        const userRef = doc(db, "users", user.uid);
        unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile({
              photoURL: data.photoURL || user.photoURL || undefined,
              displayName: data.name || user.displayName || undefined,
            });
          }
        }, (error) => {
          console.error("Error listening to user document in navigation:", error);
        });
      } else {
        setUserProfile(null);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setActiveItem(location.pathname);
    setIsOpen(false);
  }, [location]);

  const isGarden = location.pathname === "/garden";

  const navItems = [
    {
      path: "/dashboard",
      label: t("nav.dashboard"),
      icon: Home,
    },
    {
      path: "/create",
      label: t("nav.create"),
      icon: Plus,
    },
    {
      path: "/connections",
      label: t("nav.search") || "Search",
      icon: Search,
    },
    {
      path: "/garden",
      label: t("nav.garden"),
      icon: Fence,
    },
    {
      path: "/profile",
      label: t("nav.profile"),
      icon: User,
    },
  ];

  const isActive = (path: string) => activeItem === path;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const effectivelyHovered = isHovered || isDropdownOpen;

  const renderNavItem = (item: any) => {
    const Icon = item.icon;
    const isItemActive = isActive(item.path);

    return (
      <div className="relative mb-2" key={item.path}>
        <Link
          to={item.path}
          onClick={() => (isMobile || isGarden) && setIsOpen(false)}
          className="block"
        >
          <div
            className={`
              relative flex items-center px-4 py-3.5 rounded-xl transition-all duration-80 ease-in-out
              ${
                isItemActive
                  ? "bg-white text-[#FB6376]"
                  : "text-white hover:bg-white/10"
              }
              ${effectivelyHovered || isOpen ? "" : "justify-center"}
              group
            `}
          >
            {/* Background circle for compact state */}
            {!effectivelyHovered && !isOpen && (
              <div
                className={`
                absolute inset-0 rounded-xl transition-all duration-300
                ${
                  isItemActive
                    ? "bg-white"
                    : "opacity-0 group-hover:bg-white/10"
                }
              `}
              />
            )}

            {/* Icon */}
            <div
              className={`relative transition-transform duration-300 ${
                isItemActive ? "scale-110" : "group-hover:scale-110"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.highlight && effectivelyHovered && (
                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />
              )}
            </div>

            {/* Label */}
            {(effectivelyHovered || isOpen) && (
              <div className="ml-4 flex-1 flex items-center justify-between">
                <span className="font-medium text-sm tracking-wide">
                  {item.label}
                </span>
                {isItemActive && (
                  <ChevronRight className="w-4 h-4 ml-2 opacity-50" />
                )}
              </div>
            )}
          </div>
        </Link>
      </div>
    );
  };

  const renderAccountDropdown = (isHoveredView: boolean, isMobileView: boolean) => {
    return (
      <DropdownMenu onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={`block w-full text-left mb-6 transition-all duration-300 rounded-xl hover:bg-white/10 ${isHoveredView ? "px-3 py-2" : "flex justify-center py-2"} focus:outline-none`}
          >
            <div className="flex items-center animate-in fade-in duration-300">
              <div className={`w-8 h-8 rounded-full border border-white/20 flex items-center justify-center overflow-hidden bg-white/10 flex-shrink-0 ${isMobileView ? "w-10 h-10" : "w-8 h-8"}`}>
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={`${isMobileView ? "text-xs" : "text-[10px]"} font-bold text-white uppercase tracking-wider`}>
                    {getInitials(userProfile?.displayName || auth.currentUser?.displayName || "User")}
                  </span>
                )}
              </div>
              {isHoveredView && (
                <div className="ml-3 flex-1 min-w-0 animate-in fade-in duration-300 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white leading-snug mb-1 break-words">
                      {userProfile?.displayName || auth.currentUser?.displayName || "User"}
                    </p>
                    <p className="text-xs text-white/60 truncate leading-none">
                      {plan?.tier ? (
                        plan.tier.toLowerCase() === 'pro' 
                          ? t('plans.pro') 
                          : plan.tier.toLowerCase() === 'starter' 
                            ? t('plans.starter') 
                            : t('plans.free')
                      ) : t('plans.free')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-64 bg-[#FB6376] border border-white/20 text-white shadow-2xl rounded-xl p-2 z-[100]" 
          align={isMobileView ? "center" : "start"} 
          sideOffset={12}
        >
          <div className="px-2 py-2">
            <p className="text-sm text-white/80 font-medium truncate">
              {auth.currentUser?.email || "user@example.com"}
            </p>
          </div>
          <DropdownMenuSeparator className="bg-white/10 my-1" />
          
          <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer transition-colors" onClick={() => { if(isMobileView) setIsOpen(false); navigate('/profile'); }}>
            <Settings className="mr-3 h-4 w-4" />
            <span>{t('menu.settings')}</span>
            <DropdownMenuShortcut className="text-white/40">↑Ctrl,</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="focus:bg-white/10 data-[state=open]:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer transition-colors">
              <Globe className="mr-3 h-4 w-4" />
              <span>{t('menu.language')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-40 bg-[#FB6376] border border-white/20 text-white shadow-2xl rounded-xl p-2 ml-1 z-[110]">
                <DropdownMenuItem 
                  className={`focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer transition-colors ${language === 'en' ? 'font-bold' : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  <span>English</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className={`focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer transition-colors ${language === 'ta' ? 'font-bold' : ''}`}
                  onClick={() => setLanguage('ta')}
                >
                  <span>தமிழ்</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className={`focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer transition-colors ${language === 'hi' ? 'font-bold' : ''}`}
                  onClick={() => setLanguage('hi')}
                >
                  <span>हिन्दी</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator className="bg-white/10 my-1" />
          
          <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer transition-colors" onClick={() => { if(isMobileView) setIsOpen(false); navigate('/pricing'); }}>
            <ArrowUpCircle className="mr-3 h-4 w-4" />
            <span>{t('menu.upgrade')}</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-white/10 my-1" />
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="focus:bg-white/10 data-[state=open]:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-4 w-4"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <span>{t('menu.learnMore')}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-56 bg-[#FB6376] border border-white/20 text-white shadow-2xl rounded-xl p-2 ml-1 z-[110]">
                <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer flex justify-between">
                  <span>{t('menu.aboutFora')}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer flex justify-between">
                  <span>{t('menu.tutorials')}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer flex justify-between">
                  <span>{t('menu.courses')}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10 my-1" />
                <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer flex justify-between">
                  <span>{t('menu.usagePolicy')}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer flex justify-between">
                  <span>{t('menu.privacyPolicy')}</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                </DropdownMenuItem>
                <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer">
                  <span>{t('menu.privacyChoices')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10 my-1" />
                <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer">
                  <span>{t('menu.shortcuts')}</span>
                  <DropdownMenuShortcut className="text-white/40">Ctrl/</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator className="bg-white/10 my-1" />
          
          <DropdownMenuItem className="focus:bg-white/10 focus:text-white rounded-lg py-2 cursor-pointer transition-colors" onClick={() => { if(isMobileView) setIsOpen(false); handleLogout(); }}>
            <LogOut className="mr-3 h-4 w-4" />
            <span>{t('menu.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const sidebarWidth = isMobile ? 280 : effectivelyHovered ? 260 : 88;

  return (
    <>
      {/* Mobile Menu Button */}
      {(isMobile || isGarden) && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-6 left-6 z-50 bg-white shadow-lg text-[#FB6376] hover:bg-white/90 border border-gray-100"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen z-30 transition-all duration-500 ease-in-out
          bg-[#FB6376] shadow-xl overflow-hidden
          ${effectivelyHovered ? "border-r border-white/10" : ""}
          ${isGarden ? "!hidden" : ""}`}
        style={{ width: `${sidebarWidth}px` }}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-center h-24 px-4">
            <Link
              to="/dashboard"
              className={`
                flex items-center transition-all duration-300
                ${effectivelyHovered ? "justify-start w-full" : "justify-center"}
              `}
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <span className="font-bold">Forá</span>
              </div>

              {effectivelyHovered && (
                <div className="ml-4">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    Forá
                  </h1>
                  <p className="text-xs text-white/60 mt-0.5">{t('nav.capsules')}</p>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto hide-scrollbar">
            {navItems.map((item) => renderNavItem(item))}
          </div>

          {/* Bottom Section */}
          <div className="px-4 py-6 border-t border-white/10">
            {/* User Info & Dropdown */}
            {auth.currentUser && renderAccountDropdown(effectivelyHovered, false)}

            {/* Product By */}
            {effectivelyHovered && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/80 text-center font-medium">
                  A Product by <span style={{ fontFamily: '"JetBrains Mono", monospace' }} className="text-white font-semibold tracking-tight">./localhost</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-screen z-40 transition-transform duration-500 ease-in-out
          bg-[#FB6376] shadow-2xl w-72 overflow-hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between h-24 px-6 border-b border-white/10">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Forá
                </h1>
                <p className="text-xs text-white/60">{t('nav.capsules')}</p>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto hide-scrollbar">
            {navItems.map((item) => renderNavItem(item))}
          </div>

          {/* Mobile Bottom */}
          <div className="px-4 py-6 border-t border-white/10">
            {/* User Info & Dropdown */}
            {auth.currentUser && renderAccountDropdown(true, true)}

            {/* Product By */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-white/80 text-center font-medium">
                A Product by <span style={{ fontFamily: '"JetBrains Mono", monospace' }} className="text-white font-semibold tracking-tight">./localhost</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
