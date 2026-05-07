import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trello2Prompt",
  description: "Turn Trello cards into clean delegation prompts for agentic coding tools.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <header className="border-b">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
              <Link href="/" className="font-semibold tracking-tight">
                Trello2Prompt
              </Link>
              <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground">
                  Boards
                </Link>
                <span aria-hidden>·</span>
                <Link href="/settings" className="hover:text-foreground">
                  Settings
                </Link>
                <ThemeToggle />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
