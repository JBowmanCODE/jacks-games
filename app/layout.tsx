import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jack's Games",
  description: "Fun browser games for kids aged 10+",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f0f1a] text-white">
        <header className="border-b border-purple-800 bg-[#1a1a2e] px-6 py-4">
          <a href="/" className="text-2xl font-bold tracking-tight text-purple-400 hover:text-purple-300 transition-colors">
            🎮 Jack&apos;s Games
          </a>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <footer className="mt-16 border-t border-purple-900 px-6 py-6 text-center text-sm text-gray-500">
          Jack&apos;s Games — for kids aged 10+
        </footer>
      </body>
    </html>
  );
}
