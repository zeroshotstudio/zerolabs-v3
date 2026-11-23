import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-archivo',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ZeroLabs — Technical Publishing & Evaluation Bench',
  description:
    'Dual-native technical publishing platform, MCP evaluation bench, and inspectable schematic library built for human engineers and autonomous AI agents.',
  openGraph: {
    title: 'ZeroLabs — Technical Publishing & Evaluation Bench',
    description:
      'Dual-native technical publishing platform, MCP evaluation bench, and inspectable schematic library built for human engineers and autonomous AI agents.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZeroLabs — Technical Publishing & Evaluation Bench',
    description:
      'Dual-native technical publishing platform, MCP evaluation bench, and inspectable schematic library built for human engineers and autonomous AI agents.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans antialiased bg-[var(--zl-ground)] text-[var(--zl-ink)] selection:bg-[var(--zl-accent-soft)] selection:text-[var(--zl-accent)]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
