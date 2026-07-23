import type { Metadata } from "next";
import { headers } from "next/headers";
import Footer from "@/components/global/Footer";
import { ThemeProvider } from "@/hooks/useTheme";
import "./globals.css";
import "./auth.css";
import "./home.css";
import "./project.css";
import "./calendar.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);

  return {
    metadataBase: baseUrl,
    title: {
      default: "TeamSync",
      template: "%s | TeamSync",
    },
    description: "A modern workspace for clarity and collaborative flow.",
    openGraph: {
      title: "TeamSync — One shared view",
      description: "A modern workspace for clarity and collaborative flow.",
      type: "website",
      images: [{ url: new URL("/og.png", baseUrl), width: 1200, height: 630, alt: "TeamSync" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "TeamSync — One shared view",
      description: "A modern workspace for clarity and collaborative flow.",
      images: [new URL("/og.png", baseUrl)],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" style={{ height: "100%" }} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  var isLoginPage = window.location.pathname.startsWith('/login');
                  if (isDark && !isLoginPage) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <ThemeProvider>
          <div style={{ flex: "1 0 auto", display: "flex", flexDirection: "column", width: "100%" }}>
            {children}
          </div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}


