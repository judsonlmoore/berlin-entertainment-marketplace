import type { ReactNode } from "react";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const ui = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      className={`${display.variable} ${ui.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
