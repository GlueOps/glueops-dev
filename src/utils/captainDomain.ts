/**
 * Sentinels readers see replaced with their own captain domain.
 *
 * `CAPTAIN_DOMAIN` becomes the full domain; `CAPTAIN_NAMESPACE` becomes its
 * first label, which is the environment namespace (e.g. "nonprod" in
 * nonprod.tenant.onglueops.com).
 */
export const DOMAIN_SENTINEL = 'CAPTAIN_DOMAIN';
export const NAMESPACE_SENTINEL = 'CAPTAIN_NAMESPACE';

/**
 * Replaces both sentinels in a string. Helm expressions such as
 * `{{ .Values.captain_domain }}` are untouched — they are real template syntax.
 */
export function replaceCaptainSentinels(text: string, captainDomain: string): string {
  return text
    .replaceAll(NAMESPACE_SENTINEL, captainDomain.split('.')[0] || '')
    .replaceAll(DOMAIN_SENTINEL, captainDomain);
}
