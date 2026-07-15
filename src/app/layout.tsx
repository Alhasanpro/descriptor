import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Descriptor — Arabic video editor",
  description: "Private transcript-led video editing for Arabic creators."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
