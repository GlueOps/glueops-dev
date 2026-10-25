import React from 'react';
import type { ReactNode } from 'react';
import OriginalCodeBlock from '@theme-original/CodeBlock';
import type CodeBlockType from '@theme/CodeBlock';
import type { WrapperProps } from '@docusaurus/types';
import { useCaptainDomain } from '@site/src/contexts/CaptainDomainContext';
import { replaceCaptainSentinels } from '@site/src/utils/captainDomain';

type Props = WrapperProps<typeof CodeBlockType>;

function replaceDomain(content: ReactNode, captainDomain: string): ReactNode {
  if (typeof content === 'string') {
    return replaceCaptainSentinels(content, captainDomain);
  }
  return content;
}

export default function CodeBlock(props: Props) {
  const { captainDomain } = useCaptainDomain();
  const newProps = {
    ...props,
    children: replaceDomain(props.children, captainDomain),
  };
  return <OriginalCodeBlock {...newProps} />;
}
