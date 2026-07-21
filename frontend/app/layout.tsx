import type { Metadata } from "next";
import { headers } from "next/headers";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
