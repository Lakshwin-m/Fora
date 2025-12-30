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
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeItem, setActiveItem] = useState(location.pathname);

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
  }, [location]);

  const navItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      path: "/create",
      label: "Create",
      icon: Plus,
      highlight: true,
    },
    {
      path: "/connections",
      label: "Connections",
      icon: Users,
    },
    {
      path: "/community",
      label: "Community",
      icon: Heart,
    },

    {
      path: "/profile",
      label: "Profile",
      icon: User,
    },
    {
      path: "/settings",
      label: "Settings",
      icon: Settings,
    },
    {
      path: "/pricing",
      label: "Pricing",
      icon: Box,
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

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const isItemActive = isActive(item.path);

    return (
      <div className="relative mb-2">
        <Link
          to={item.path}
          onClick={() => isMobile && setIsOpen(false)}
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
              ${isHovered || isOpen ? "" : "justify-center"}
              group
            `}
          >
            {/* Background circle for compact state */}
            {!isHovered && !isOpen && (
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
              {item.highlight && isHovered && (
                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />
              )}
            </div>

            {/* Label */}
            {(isHovered || isOpen) && (
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

  const sidebarWidth = isMobile ? 280 : isHovered ? 240 : 88;

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
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
          bg-[#FB6376] shadow-xl
          ${isHovered ? "border-r border-white/10" : ""}`}
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
                ${isHovered ? "justify-start w-full" : "justify-center"}
              `}
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>

              {isHovered && (
                <div className="ml-4">
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    Forá
                  </h1>
                  <p className="text-xs text-white/60 mt-0.5">Time Capsules</p>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>

          {/* Bottom Section */}
          <div className="px-4 py-6 border-t border-white/10">
            {/* User Info */}
            {isHovered && auth.currentUser && (
              <div className="mb-6 px-3 py-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {auth.currentUser.displayName?.split(" ")[0] || "User"}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {auth.currentUser.email?.split("@")[0]}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <Button
              variant="ghost"
              className={`
                w-full justify-start text-white hover:bg-white/10 rounded-xl transition-all duration-300
                ${isHovered ? "px-4 py-3" : "px-3 py-3 justify-center"}
              `}
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              {isHovered && (
                <span className="ml-4 font-medium text-sm">Sign Out</span>
              )}
            </Button>

            {/* Capsule Count */}
            {isHovered && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 text-center">
                  Preserving memories
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
          bg-[#FB6376] shadow-2xl w-72
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
                <p className="text-xs text-white/60">Time Capsules</p>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>

          {/* Mobile Bottom */}
          <div className="px-4 py-6 border-t border-white/10">
            {auth.currentUser && (
              <div className="mb-6 px-3 py-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {auth.currentUser.displayName || "User"}
                    </p>
                    <p className="text-xs text-white/50">
                      {auth.currentUser.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-white/10 px-4 py-3 rounded-xl"
              onClick={() => {
                setIsOpen(false);
                setTimeout(handleLogout, 300);
              }}
            >
              <LogOut className="w-5 h-5 mr-4" />
              <span className="font-medium text-sm">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
