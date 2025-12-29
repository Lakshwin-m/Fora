import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { SignupLoginForm } from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProtectedRoute from "./pages/ProtectedRoutes";
import { CapsuleProvider } from "./contexts/CapsuleContext";
import CreateCapsule from "./pages/CreateCapsule";
import Connections from "./pages/Connections";
import Settings from "./pages/Settings";
import CapsuleDetail from "./components/CapsuleDetail";
import ExploreCapsulesPage from "./pages/ExploreCapsulesPage";
import CapsuleDetailPage from "./pages/CapsuleDetailPage";
import UserCapsulesPage from "./pages/UserCapsulesPage";
import { useEffect } from "react";
import { getFCMToken, onForegroundMessage } from "./notifications.js";
import { PricingDemo } from "./pages/PricingPage";
function App() {
  useEffect(() => {
    getFCMToken().then((token) => {
      console.log("FCM Token:", token);
    });
    onForegroundMessage();
  }, []);

  return (
    <CapsuleProvider>
      <Router>
        <Routes>
          <Route path="/signup" element={<SignupLoginForm />} />
          <Route path="/login" element={<SignupLoginForm />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                <CreateCapsule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/connections"
            element={
              <ProtectedRoute>
                <Connections />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/capsule/:id"
            element={
              <ProtectedRoute>
                <CapsuleDetail />
              </ProtectedRoute>
            }
          />

          {/* Community Routes */}
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <ExploreCapsulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/capsule/:id"
            element={
              <ProtectedRoute>
                <CapsuleDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/user/:userId"
            element={
              <ProtectedRoute>
                <UserCapsulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <PricingDemo />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </CapsuleProvider>
  );
}

export default App;
