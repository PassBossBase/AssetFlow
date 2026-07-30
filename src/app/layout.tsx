import type { Metadata } from "next";

import { ConvexClientProvider } from "@/components/convex-client-provider";
import { LanguageProvider } from "@/components/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Toaster } from "@/components/ui/toast";

import "./globals.css";

export const metadata: Metadata = {
  title: "AssetFlow AI",
  description: "Digital Asset Management Platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <LanguageToggle />
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
