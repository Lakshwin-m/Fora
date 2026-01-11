import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { SignUpLoginForm } from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProtectedRoute from "./pages/ProtectedRoutes";
import { CapsuleProvider } from "./contexts/CapsuleContext";
import CreateCapsule from "./pages/CreateCapsule";
import Connections from "./pages/Connections";
import Settings from "./pages/Settings";
import CapsuleDetail from "./components/CapsuleDetail";
import ExploreCapsulesPage from "./pages/ExploreCapsulesPage";

import UserCapsulesPage from "./pages/UserCapsulesPage";
import { useEffect } from "react";
import { getFCMToken, onForegroundMessage } from "./notifications.js";
import { PricingDemo } from "./pages/PricingPage";
import Garden from "./pages/Garden.tsx";
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
          <Route path="/signup" element={<SignUpLoginForm />} />
          <Route path="/login" element={<SignUpLoginForm />} />

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
            path="/garden"
            element={
              <ProtectedRoute>
                <Garden />
              </ProtectedRoute>
            }
          />
          <Route
            path="/flower/:slug"
            element={
              <ProtectedRoute>
                <Garden />
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
