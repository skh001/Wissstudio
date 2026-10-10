import type { Metadata, Viewport } from "next";
import "@fontsource-variable/jost";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "WissNails Studio", template: "%s · WissNails Studio" },
  description: "The studio manager for WissNails — appointments, clients, stock and finance.",
  applicationName: "WissNails Studio",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "WissNails", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFBFC" },
    { media: "(prefers-color-scheme: dark)", color: "#171113" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
