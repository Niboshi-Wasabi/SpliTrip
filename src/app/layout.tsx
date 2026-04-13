import "./globals.css";
import { Geist } from "next/font/google";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


/**
 * Root shell required by Next.js; real `<html>` lives in `[locale]/layout`.
 * Next.js 要件のルートシェル。実体の `<html>` は `[locale]/layout` に置く。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
