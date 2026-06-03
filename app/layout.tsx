import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "DealHunter",
  description: "Real estate investment data, lead generation, and market analytics platform.",
  metadataBase: new URL("https://dealhunterapp.vercel.app"),
  openGraph: {
    title: "DealHunter",
    description: "Real estate investment data, lead generation, and market analytics platform.",
    url: "https://dealhunterapp.vercel.app",
    siteName: "DealHunter",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DealHunter Dashboard" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DealHunter",
    description: "Real estate investment data, lead generation, and market analytics platform.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-60 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  );
}
