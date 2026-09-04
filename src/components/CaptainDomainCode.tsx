import React from 'react';
import type { ReactNode } from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import { useCaptainDomain } from '@site/src/contexts/CaptainDomainContext';
import { replaceCaptainSentinels } from '@site/src/utils/captainDomain';

const OriginalCode = MDXComponents.code;

/**
 * Docusaurus treats a <code> as inline when every child is a string without a
 * newline; anything else is a fenced block, already handled by the swizzled
 * CodeBlock. Mirror that test so we only touch inline code here.
 */
function isInlineCode(children: ReactNode): boolean {
  return (
    typeof children !== 'undefined' &&
    React.Children.toArray(children).every(
      (child) => typeof child === 'string' && !child.includes('\n')
    )
  );
}

/**
 * Replaces the CAPTAIN_DOMAIN / CAPTAIN_NAMESPACE sentinels inside inline
 * `code` spans, so prose, tables and admonitions track the reader's domain the
 * same way code fences do.
 */
export default function CaptainDomainCode(props) {
  const { captainDomain } = useCaptainDomain();

  if (!isInlineCode(props.children)) {
    return <OriginalCode {...props} />;
  }

  const children = React.Children.toArray(props.children)
    .map((child) => replaceCaptainSentinels(child as string, captainDomain))
    .join('');

  return <OriginalCode {...props}>{children}</OriginalCode>;
}
