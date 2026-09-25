import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giriş Yap — Döküm Operasyon Takip Sistemi',
  description: 'Döküm tesisi operasyon yönetim paneline güvenli giriş.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
