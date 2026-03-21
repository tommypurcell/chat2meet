import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth-context";
import { DevNav } from "@/components/ui/DevNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat 2 Meet",
  description: "Schedule meetings through chat — no grid required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} data-theme="dark" suppressHydrationWarning>
      <body className="min-h-full font-sans">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <DevNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
