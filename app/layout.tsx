import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ViewTransitions } from "next-view-transitions";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Bookshelf",
  description: "Ma bibliothèque virtuelle",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bookshelf",
  },
};

export const viewport: Viewport = {
  themeColor: "#B45309",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ViewTransitions>
      <html lang="fr" className={`${geist.variable} h-full`}>
        <body className="min-h-dvh flex flex-col bg-[#fafaf8]">
          <ServiceWorkerRegistrar />
          <main className="flex-1 pb-32">{children}</main>
          <BottomNav />
        </body>
      </html>
    </ViewTransitions>
  );
}
