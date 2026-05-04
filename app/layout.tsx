import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <-- ВОТ ЭТА СТРОЧКА САМАЯ ВАЖНАЯ

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Путь героя",
  description: "Дашборд для Али и Саида",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>{children}</body>
    </html>
  );
}