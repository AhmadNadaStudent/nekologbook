import type { Metadata } from "next";
import { MuseoModerno } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import "./globals.css";

const museo = MuseoModerno({
  variable: "--font-museo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Neko Logbook PDF Converter",
  description:
    "Ubah foto formulir logbook kucing menjadi PDF rapi dan ringan siap diarsipkan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${museo.variable} antialiased`}>
        <AppRouterCacheProvider>
          {children}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
