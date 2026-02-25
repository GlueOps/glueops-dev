import React from 'react';
import OriginalCodeBlock from '@theme-original/CodeBlock';
import { useCaptainDomain } from '@site/src/contexts/CaptainDomainContext';

const SENTINEL = 'CAPTAIN_DOMAIN';

function replaceDomain(content: unknown, captainDomain: string): unknown {
  if (typeof content === 'string') {
    return content.replaceAll(SENTINEL, captainDomain);
  }
  return content;
}

export default function CodeBlock(props) {
  const { captainDomain } = useCaptainDomain();
  const newProps = {
    ...props,
    children: replaceDomain(props.children, captainDomain),
  };
  return <OriginalCodeBlock {...newProps} />;
}
