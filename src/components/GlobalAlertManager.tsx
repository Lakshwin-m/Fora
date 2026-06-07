import React, { useEffect, useState } from "react";
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from "@/components/ui/alert-1";
import { CheckCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export const GlobalAlertManager = () => {
  const [alerts, setAlerts] = useState<{ id: string; title: string; description: string }[]>([]);

  useEffect(() => {
    const handleCapsuleCreated = (e: CustomEvent) => {
      const newAlert = {
        id: crypto.randomUUID(),
        title: e.detail.title || "Capsule Sealed 🔒",
        description: e.detail.description || "Your capsule has been created and encrypted successfully!",
      };
      
      setAlerts((prev) => [...prev, newAlert]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      }, 5000);
    };

    window.addEventListener("capsule-created" as any, handleCapsuleCreated);
    return () => window.removeEventListener("capsule-created" as any, handleCapsuleCreated);
  }, []);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-4 w-[400px] max-w-[calc(100vw-48px)]">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Alert variant="success" appearance="light" close={true} onClose={() => removeAlert(alert.id)}>
              <AlertIcon>
                <CheckCircle className="text-[#FB6376] w-5 h-5" />
              </AlertIcon>
              <AlertContent>
                <AlertTitle className="text-[#5D2A42]">{alert.title}</AlertTitle>
                <AlertDescription className="text-[#5D2A42]/80">
                  {alert.description}
                </AlertDescription>
              </AlertContent>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
