import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kaleidoscope TCG",
  description: "Local 1v1 battle prototype"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
