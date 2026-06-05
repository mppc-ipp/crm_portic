import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "CRM Portic — Reservas",
  description: "CRM interno do Portic",
  icons: {
    icon: [
      { url: "/logos/favicon.ico", type: "image/x-icon" },
      { url: "/logos/favicon.png", type: "image/png" },
    ],
    shortcut: "/logos/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-slate-900">
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <AppShell>{children}</AppShell>
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
