import type { Metadata } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-cinzel',
});

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

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
    <html lang="en" className={`${cinzel.variable} ${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
