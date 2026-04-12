import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Fraunces } from "next/font/google";
import { Providers } from "@/components/providers";
import SharedBackground from "./components/SharedBackground";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal"], // upright only — no italic anywhere
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ManifestMyStory — Your Future Is Already Speaking",
  description:
    "A guided conversation draws out your deepest vision. We turn it into a rich, sensory story — then narrate it back to you in your own voice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${inter.variable} ${fraunces.variable}`}>
        <Providers>
          <SharedBackground />
          {children}
        </Providers>
      </body>
    </html>
  );
}
