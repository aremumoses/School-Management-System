import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { SessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Poppins is the only font used anywhere in the app — see
// prompts/00-DESIGN-SYSTEM.md §3. Exposed as --font-sans so every
// shadcn/ui component (which reads that variable) picks it up automatically.
// It is not a variable font, so every weight in use has to be listed.
const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "School Management System",
  description:
    "School Management System for one secondary school in Lagos, Nigeria.",
  // Stage 11 hardening — PWA installability:
  // Next.js reads these via the Metadata API and injects the appropriate
  // <link> tags, so Chrome's "Add to Home Screen" prompt fires correctly
  // and the iOS splash screen uses the right icon.
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is required by next-themes: it writes the
    // resolved `class` onto <html> in a blocking pre-hydration script, so the
    // server-rendered markup deliberately differs from the first client pass.
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <SessionProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </SessionProvider>
          <Toaster />
        </ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
