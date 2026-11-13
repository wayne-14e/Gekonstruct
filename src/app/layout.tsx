import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Gekonstruct — own the code you vibe-coded",
    template: "%s · Gekonstruct",
  },
  description:
    "Connect a public repo and Geko the chameleon turns your own code into lessons, a plain-English map, and a debug guide.",
  applicationName: "Gekonstruct",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Gekonstruct",
    description:
      "You vibe-coded it. Now own it. Learn your own codebase through guided lessons, an architecture map, and debug walkthroughs.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${fraunces.variable} ${jetbrains.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
