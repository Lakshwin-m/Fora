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
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const navItems = [
    { path: "/dashboard", label: "My Capsules", icon: Clock },
    { path: "/community", label: "Community", icon: Archive },
    { path: "/connections", label: "Connections", icon: Users },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const sidebarWidth = isMobile ? 280 : isOpen || isHovered ? 280 : 80;

  return (
    <>
      {/* Mobile Menu Button */}
      {!isOpen && isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-[#FB6376] text-white hover:bg-white/20"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col flex-shrink-0 fixed left-0 top-0 h-screen z-30 transition-all duration-300 bg-[#FB6376]  border-white/20`}
        style={{ width: `${sidebarWidth}px` }}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-center h-16 border-b border-white/20 px-4 flex-shrink-0">
            <Link
              to="/dashboard"
              className="flex items-center justify-center w-full"
            >
              <span className="text-2xl font-bold text-white">
                {isOpen || isHovered ? "Forá" : "F"}
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map(({ path, label, icon: Icon }) => (
              <div key={path} className="mb-1">
                <Link to={path}>
                  <Button
                    variant={isActive(path) ? "default" : "ghost"}
                    className={`w-full justify-start transition-all duration-200 rounded-lg ${
                      isActive(path)
                        ? "bg-white/20 shadow-lg text-white border border-white/30"
                        : "text-white/90 hover:bg-white/10 hover:text-white"
                    } ${isOpen || isHovered ? "px-4 py-3" : "px-3 py-3"}`}
                    size={isOpen || isHovered ? "default" : "icon"}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5" />
                      {(isOpen || isHovered) && (
                        <span className="ml-3 font-medium whitespace-nowrap">
                          {label}
                        </span>
                      )}
                    </div>
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Bottom Actions Section */}
          <div className="px-4 py-6 border-t border-white/20 space-y-3 flex-shrink-0">
            {/* Create Button */}
            <div>
              <Link to="/create">
                <Button
                  className={`w-full bg-white text-[#FB6376] hover:bg-white/90 hover:text-[#FB6376] transition-all duration-200 font-medium ${
                    isOpen || isHovered ? "px-4 py-3" : "px-3 py-3"
                  }`}
                  size={isOpen || isHovered ? "default" : "icon"}
                >
                  <Plus className="w-5 h-5" />
                  {(isOpen || isHovered) && (
                    <span className="ml-3 whitespace-nowrap">Create</span>
                  )}
                </Button>
              </Link>
            </div>

            {/* Logout Button */}
            <div>
              <Button
                variant="ghost"
                className={`w-full justify-start text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200 ${
                  isOpen || isHovered ? "px-4 py-3" : "px-3 py-3"
                }`}
                size={isOpen || isHovered ? "default" : "icon"}
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                {(isOpen || isHovered) && (
                  <span className="ml-3 font-medium whitespace-nowrap">
                    Sign Out
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } bg-gradient-to-b from-[#FB6376] to-[#FF8B9A] border-r border-white/20 w-72`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between h-16 border-b border-white/20 px-6 flex-shrink-0">
            <Link
              to="/dashboard"
              className="flex items-center"
              onClick={() => setIsOpen(false)}
            >
              <span className="text-2xl font-bold text-white">Forá</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Mobile Navigation Items */}
          <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map(({ path, label, icon: Icon }) => (
              <div key={path} className="mb-1">
                <Link to={path} onClick={() => setIsOpen(false)}>
                  <Button
                    variant={isActive(path) ? "default" : "ghost"}
                    className={`w-full justify-start transition-all duration-200 rounded-lg px-4 py-3 ${
                      isActive(path)
                        ? "bg-white/20 shadow-lg text-white border border-white/30"
                        : "text-white/90 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5" />
                      <span className="ml-3 font-medium whitespace-nowrap">
                        {label}
                      </span>
                    </div>
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          {/* Mobile Bottom Actions */}
          <div className="px-4 py-6 border-t border-white/20 space-y-3 flex-shrink-0">
            <div>
              <Link to="/create" onClick={() => setIsOpen(false)}>
                <Button className="w-full bg-white text-[#FB6376] hover:bg-white/90 hover:text-[#FB6376] px-4 py-3 font-medium">
                  <Plus className="w-5 h-5 mr-3" />
                  Create Capsule
                </Button>
              </Link>
            </div>

            <div>
              <Button
                variant="ghost"
                className="w-full justify-start text-white/90 hover:text-white hover:bg-white/10 px-4 py-3"
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-medium">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
