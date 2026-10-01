import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPL Zero to Hero · Learn Splunk through SQL",
  description:
    "Learn Splunk SPL with animated lessons, hands-on query labs, and real SQLite comparisons. From your first event to advanced investigations.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
