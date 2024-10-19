import type { Metadata } from "next";
// import localFont from "next/font/local";
import AdvancedImageCompressor from '../components/AdvancedImageCompressor'
import "./globals.css";

// Remove or comment out these unused variables
// const geistSans = localFont({
//   src: "./fonts/GeistVF.woff",
//   variable: "--font-geist-sans",
//   weight: "100 900",
// });
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });

export const metadata: Metadata = {
  title: "Advanced Image Compressor",
  description: "Compress and optimize your images easily",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
