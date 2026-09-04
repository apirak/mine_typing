import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxel Typing Game — Gameplay Prototype",
  description: "Practice the F and J home-row keys in an original voxel adventure.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
