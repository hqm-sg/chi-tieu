import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quản lý chi tiêu",
  description: "@HQM - 2026",
  themeColor: "#22c55e",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/pig-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pig-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/pig-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
