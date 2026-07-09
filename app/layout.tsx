import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kareya",
  description: "AI-kadrolu web ajansı",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
