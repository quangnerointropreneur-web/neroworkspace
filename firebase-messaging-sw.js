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
  
  // Resilient title/body extraction
  const notificationTitle = 
    payload.notification?.title || 
    payload.data?.title || 
    "Nero Workspace Cập nhật";
    
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "Bạn có nội dung mới cần kiểm tra.",
    icon: "/icon.png",
    badge: "/icon.png", // Small icon for top bar on Android
    tag: payload.data?.tag || "nero-update", // Grouping
    data: {
       // Look for URL in multiple possible locations
       url: payload.fcm_options?.link || payload.data?.url || payload.data?.link || "/dashboard/tasks"
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/dashboard/tasks';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Try to find a matching open window and focus it
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        // Match base URL to avoid opening multiple tabs of the same dashboard
        if (client.url.includes('/dashboard') && 'focus' in client) {
          // If we want to be exact about the URL, we could navigate the existing client
          if (client.url !== urlToOpen && 'navigate' in client) {
            return client.navigate(urlToOpen).then(c => c.focus());
          }
          return client.focus();
        }
      }
      // 2. If no window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
