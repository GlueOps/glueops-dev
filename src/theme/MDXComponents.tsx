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

export default {
  ...MDXComponents,
  CaptainDomain,
  CaptainDomainLink,
};
