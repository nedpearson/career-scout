import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/Shell";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "JobTracker",
  description: "Track jobs, score fit, research companies, and send outreach."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} font-sans`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}

