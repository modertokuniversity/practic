import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreHydration } from "@/components/StoreHydration";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "TimeTracker — облік робочого часу",
  description: "Вебзастосунок для обліку робочого часу працівників",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={inter.variable}>
      <body className="font-sans text-ink-800 antialiased">
        <StoreHydration>{children}</StoreHydration>
      </body>
    </html>
  );
}
