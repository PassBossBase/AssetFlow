import type { Metadata } from "next";

import { ConvexClientProvider } from "@/components/convex-client-provider";
import { LanguageProvider } from "@/components/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Toaster } from "@/components/ui/toast";
import { getToken } from "@/lib/auth-server";

import "./globals.css";

export const metadata: Metadata = {
  title: "AssetFlow AI",
  description: "Digital Asset Management Platform",
  icons: {
    icon: "/images/icon.svg",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const initialToken = process.env.NEXT_PUBLIC_CONVEX_URL === undefined ? null : await getToken();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <ConvexClientProvider initialToken={initialToken}>{children}</ConvexClientProvider>
          <LanguageToggle />
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
