import React from 'react';
import type { ReactNode } from 'react';
import { CaptainDomainProvider } from '@site/src/contexts/CaptainDomainContext';

export default function Root({ children }: { children: ReactNode }) {
  return <CaptainDomainProvider>{children}</CaptainDomainProvider>;
}
