importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyA3Fs3P-gR-ofK1nB03j8nM6f8RSopeBkw",
  authDomain: "neroworkspace-3ecf6.firebaseapp.com",
  projectId: "neroworkspace-3ecf6",
  storageBucket: "neroworkspace-3ecf6.firebasestorage.app",
  messagingSenderId: "108666922161",
  appId: "1:108666922161:web:840f06a6dcf5b3521f2e90",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
