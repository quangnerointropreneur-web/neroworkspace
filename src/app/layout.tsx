import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import NotificationManager from "@/components/notifications/NotificationManager";

export const metadata: Metadata = {
  title: "Nero Workspace",
  description: "Hệ thống quản lý công việc và vận hành nội bộ Nero",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nero Ops",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;1,400&family=Google+Sans+Display:wght@300;400;500;600&family=Anonymous+Pro:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body>
        <AppProvider>
          {children}
          <NotificationManager />
        </AppProvider>
      </body>
    </html>
  );
}

