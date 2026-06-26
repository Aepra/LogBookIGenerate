import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Navbar from "@/components/layout/Navbar";
import MobileNav from "@/components/layout/MobileNav";
import NextTopLoader from "nextjs-toploader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Riwaya'",
  description: "Platform manajemen logbook terintegrasi Google Drive.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-[var(--system-background)] text-[var(--text-primary)] font-sans">
        <NextTopLoader 
          color="#b30000" 
          initialPosition={0.08} 
          crawlSpeed={200} 
          height={3} 
          crawl={true} 
          showSpinner={true} 
          easing="ease" 
          speed={200} 
          shadow="0 0 10px #b30000,0 0 5px #b30000" 
        />
        <Navbar user={session?.user || null} />
        <main className="pb-20 md:pb-0">{children}</main>
        <MobileNav />
      </body>
    </html>
  );
}
