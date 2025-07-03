import type { Metadata } from "next";
import "./globals.css";
import { TranslationProvider } from "@/lib/useTranslation";

export const metadata: Metadata = {
  title: "VideoPresenter Pro",
  description: "Professional video presentation and recording app with drag & drop, screen capture, and real-time effects",
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased h-full">
        <div id="root" className="h-full">
          <TranslationProvider>
            {children}
          </TranslationProvider>
        </div>
      </body>
    </html>
  );
}
