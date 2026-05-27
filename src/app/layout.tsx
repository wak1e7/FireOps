import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import { ToastProvider } from "@/modules/shared/components/toast-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "FireOps",
  description: "Control operativo en tiempo real para compañías de bomberos.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#0B1120",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();

  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
