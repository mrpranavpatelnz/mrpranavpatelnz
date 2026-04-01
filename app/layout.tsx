import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '0.1% Advisor — Frameworks for the Top 0.1%',
  description: 'Get the rare, high-leverage frameworks used by the top 0.1% to tackle any challenge — finance, health, career, business, and beyond.',
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
