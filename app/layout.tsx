import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Wursten Deals",
  description: "Real estate investment data, lead generation, and market analytics — by Wursten.",
  metadataBase: new URL("https://wurstendeals.vercel.app"),
  openGraph: {
    title: "Wursten Deals",
    description: "Real estate investment data, lead generation, and market analytics — by Wursten.",
    url: "https://wurstendeals.vercel.app",
    siteName: "Wursten Deals",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Wursten Deals Dashboard" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wursten Deals",
    description: "Real estate investment data, lead generation, and market analytics — by Wursten.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen" style={{ background: "#f5f1ee" }}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-60 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  );
}
