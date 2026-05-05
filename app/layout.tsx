import type { Metadata } from "next";
import "./globals.css";
import { ChildProvider } from "@/app/lib/ChildContext";

export const metadata: Metadata = {
  title: "Путь героя",
  description: "Дашборд для Али и Саида — ежедневные задачи, оценки и награды",
  manifest: "/manifest.json",
  themeColor: "#3B82F6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Путь героя",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <meta name="application-name" content="Путь героя" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Путь героя" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body
        style={{
          margin: 0,
          background: "#F4F7FB",
          color: "#1e293b",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <ChildProvider>{children}</ChildProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
                const allowLocalSW = window.localStorage.getItem('ali1-allow-sw') === '1';
                if (!isProd && !allowLocalSW) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    return Promise.all(registrations.map(function(reg) { return reg.unregister(); }));
                  }).catch(function() {});
                  return;
                }
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.log('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
