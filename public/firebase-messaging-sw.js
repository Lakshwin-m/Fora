importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyA1UihhSWi0Q3yvfmTWyqaG30jQkJZXHAM",
  authDomain: "localhost-b5ee6.firebaseapp.com",
  projectId: "localhost-b5ee6",
  storageBucket: "localhost-b5ee6.firebasestorage.app",
  messagingSenderId: "558121772975",
  appId: "1:558121772975:web:dc3556e70bfd020137715a",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
  });
});
