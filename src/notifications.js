import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "./firebase";

const VAPID_KEY =
  "BL68wE17qiBjtVFclqSjyodac4WslbdkU7EIY1uFK9SPKVh3bjv-gr23XbsfGYLzBgPGx0_1TsU7VT_nLepHGu0";

export const getFCMToken = async () => {
  const savedToken = localStorage.getItem("fcmToken");
  if (savedToken) return savedToken;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (token) {
    localStorage.setItem("fcmToken", token);
  }

  return token;
};

export const onForegroundMessage = () => {
  onMessage(messaging, (payload) => {
    console.log("Message received. ", payload);
    alert(
      `Notification: ${payload.notification?.title} - ${payload.notification?.body}`
    );
  });
};
