import { useState } from "react";
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
} from "lucide-react";

import { signOut } from "firebase/auth";
import { auth } from "@/firebase"; // make sure this points to your firebase.ts

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/dashboard", label: "Capsules", icon: Clock },
    { path: "/connections", label: "Connections", icon: Users },
    { path: "/profile", label: "Profile", icon: User },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/"); // redirect to login/signup
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="flex items-center space-x-3 hover-glow rounded-lg p-2 -ml-2"
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Forá
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}>
                <Button
                  variant={isActive(path) ? "default" : "ghost"}
                  size="sm"
                  className={`transition-smooth ${
                    isActive(path)
                      ? "bg-gradient-primary shadow-glow"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Button>
              </Link>
            ))}

            <div className="w-px h-6 bg-border mx-2" />

            <Link to="/create">
              <Button size="sm" className="bg-gradient-accent hover-glow">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-destructive/20"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border mt-4">
            <div className="flex flex-col space-y-2">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive(path) ? "default" : "ghost"}
                    className={`w-full justify-start transition-smooth ${
                      isActive(path)
                        ? "bg-gradient-primary shadow-glow"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {label}
                  </Button>
                </Link>
              ))}

              <div className="h-px bg-border my-2" />

              <Link to="/create" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full justify-start bg-gradient-accent hover-glow">
                  <Plus className="w-4 h-4 mr-3" />
                  Create Capsule
                </Button>
              </Link>

              <Button
                variant="ghost"
                className="w-full justify-start hover:bg-destructive/20"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
