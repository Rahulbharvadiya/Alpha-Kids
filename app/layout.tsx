import type { Metadata } from "next";
import { Outfit, Nunito_Sans, DM_Sans, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";

// Pairing A: Warm and Supportive
const heading = Outfit({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-heading",
  display: "swap",
});

const body = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-body",
  display: "swap",
});

const button = DM_Sans({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-button",
  display: "swap",
});

const urdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "500"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alpha Kids Parenting Coach",
  description: "Short, practical, safe parenting guidance in English and Urdu.",
};

const themeInit = `
(function () {
  try {
    var t = localStorage.getItem("alphakids:theme");
    var dark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${heading.variable} ${body.variable} ${button.variable} ${urdu.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh antialiased bg-bg text-text">
        {children}
      </body>
    </html>
  );
}
