import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthProvider";
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
  title: {
    default: "AddBuy+C｜買う前に、ひとりで迷わない。",
    template: "%s | AddBuy+C",
  },
  description:
    "ファッション・コスメ・ガジェット・グルメまで、気になる商品やお店について相談できるコミュニティです。",
  alternates: { canonical: "https://addbuyc.com" },
  openGraph: {
    title: "AddBuy+C｜買う前に、ひとりで迷わない。",
    description:
      "ファッション・コスメ・ガジェット・グルメまで、気になる商品やお店について相談できるコミュニティです。",
    url: "https://addbuyc.com",
    siteName: "AddBuy+C",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AddBuy+C｜買う前に、ひとりで迷わない。",
    description:
      "ファッション・コスメ・ガジェット・グルメまで、気になる商品やお店について相談できるコミュニティです。",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white font-sans antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
