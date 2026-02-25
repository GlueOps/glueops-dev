import React from 'react';
import { CaptainDomainProvider } from '@site/src/contexts/CaptainDomainContext';

export default function Root({ children }) {
  return <CaptainDomainProvider>{children}</CaptainDomainProvider>;
}
