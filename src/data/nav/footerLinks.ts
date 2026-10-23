/**
 * The footer's three links to the ICEFLO customer portal (app shell brief, section 5a; decided by Andy Smith,
 * 23 Oct 2026). Typed data in one place, not strings in a component. Each opens in a new tab. The footer's
 * `links` prop may override an address (for a test or another environment); these are the product's.
 */
export const RBM_FOOTER_LINKS = [
  { key: 'privacy', label: 'Privacy', href: 'https://customer.iceflo.com/privacy' },
  { key: 'support', label: 'Support', href: 'https://customer.iceflo.com/portal' },
  { key: 'knowledge', label: 'Knowledge', href: 'https://customer.iceflo.com/knowledge' },
] as const;

export type RbmFooterLinkKey = (typeof RBM_FOOTER_LINKS)[number]['key'];

/** A link's address: the override if given, otherwise the product's. */
export const footerHref = (key: RbmFooterLinkKey, overrides: Partial<Record<RbmFooterLinkKey, string>> = {}) =>
  overrides[key] ?? RBM_FOOTER_LINKS.find((l) => l.key === key)!.href;
