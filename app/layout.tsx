import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "./components/navbar";
import Breadcrumbs from "./components/breadcrumbs";
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
  title: "Speedball Stats",
  description: "Competitive speedball stats and match tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <Breadcrumbs />
        <main className="flex flex-1 min-h-0 flex-col">{children}</main>
      </body>
    </html>
  );
}
