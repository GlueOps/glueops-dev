import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import { useCaptainDomain } from '@site/src/contexts/CaptainDomainContext';
import CaptainDomainLink from '@site/src/components/CaptainDomainLink';

function CaptainDomain() {
  const { captainDomain, isDefault } = useCaptainDomain();
  return (
    <span className={`captain-domain-inline${isDefault ? '' : ' captain-domain-custom'}`}>
      {captainDomain}
    </span>
  );
}

function CaptainDomainPart({ segment }: { segment: 'cluster' | 'tenant' | 'tld' }) {
  const { captainDomain, isDefault } = useCaptainDomain();
  const parts = captainDomain.split('.');

  let value: string;
  if (segment === 'cluster') {
    value = parts[0] || '';
  } else if (segment === 'tenant') {
    value = parts[1] || '';
  } else {
    // tld: everything from the third segment onward (e.g. "onglueops.com")
    value = parts.slice(2).join('.') || '';
  }

  return (
    <span className={`captain-domain-inline${isDefault ? '' : ' captain-domain-custom'}`}>
      {value}
    </span>
  );
}

export default {
  ...MDXComponents,
  CaptainDomain,
  CaptainDomainPart,
  CaptainDomainLink,
};
