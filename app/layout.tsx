import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { ThemeProvider } from "next-themes";
import StructuredData from "@/components/structured-data";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "WhatsApp Web",
    template: "%s | WhatsApp Web"
  },
  description: "Inicia sesión en WhatsApp Web para enviar mensajes de forma sencilla, fiable y privada en tu ordenador. Envía y recibe mensajes y archivos fácilmente y totalmente gratis.",
  applicationName: "WhatsApp Web",
  authors: [{ name: "WhatsApp" }],
  generator: "Next.js",
  keywords: ["whatsapp", "mensajería", "chat", "mensajes", "web", "mensajería instantánea", "comunicación"],
  referrer: "origin-when-cross-origin",
  creator: "WhatsApp",
  publisher: "WhatsApp",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "any" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/logo.png"],
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: defaultUrl,
    siteName: "WhatsApp Web",
    title: "WhatsApp Web",
    description: "Inicia sesión en WhatsApp Web para enviar mensajes de forma sencilla, fiable y privada en tu ordenador. Envía y recibe mensajes y archivos fácilmente y totalmente gratis.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "WhatsApp Web Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WhatsApp Web",
    description: "Inicia sesión en WhatsApp Web para enviar mensajes de forma sencilla, fiable y privada en tu ordenador. Envía y recibe mensajes y archivos fácilmente y totalmente gratis.",
    images: ["/logo.png"],
    creator: "@WhatsApp",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
};

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f2f5" },
    { media: "(prefers-color-scheme: dark)", color: "#111b21" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <StructuredData />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WhatsApp" />
        <meta name="msapplication-TileColor" content="#25d366" />
        <meta name="theme-color" content="#075e54" />
      </head>
      <body className={`${roboto.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

