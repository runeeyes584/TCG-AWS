import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GlobalAudioProvider } from "../contexts/AudioContext";
import { SessionGuard } from "../components/session/SessionGuard";

// The fonts are kept in the repository (Latin subset, from Google Fonts, SIL Open Font License) rather than loaded
// with next/font/google, which downloads them from Google on every build: a slow or blocked connection to Google
// then fails `npm run build` (and the Amplify build). The CSS variables are unchanged.

const cinzel = localFont({
  src: "../assets/fonts/Cinzel-Variable.woff2",
  weight: "400 900",
  variable: "--font-cinzel",
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman"
});

const rajdhani = localFont({
  src: [
    { path: "../assets/fonts/Rajdhani-500.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/Rajdhani-600.woff2", weight: "600", style: "normal" },
    { path: "../assets/fonts/Rajdhani-700.woff2", weight: "700", style: "normal" }
  ],
  variable: "--font-rajdhani",
  display: "swap",
  fallback: ["system-ui", "sans-serif"]
});

const geistSans = localFont({
  src: "../assets/fonts/Geist-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"]
});

const geistMono = localFont({
  src: "../assets/fonts/GeistMono-Variable.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
  adjustFontFallback: false
});

export const metadata: Metadata = {
  title: "Chrono Genesis TCG",
  description: "Local 1v1 battle prototype"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${rajdhani.variable} ${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="antialiased" suppressHydrationWarning>
        <GlobalAudioProvider>
          {children}
          <SessionGuard />
        </GlobalAudioProvider>
      </body>
    </html>
  );
}

