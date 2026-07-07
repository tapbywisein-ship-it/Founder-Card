/**
 * URL for the backend-generated .vcf contact download ("Save contact" on a
 * Tap Card). Server-built so anonymous visitors get it too and the payload
 * exactly matches what the public card page exposes.
 * (Calendar links are client-generated — see lib/calendar.ts.)
 */

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1';

export const cardVcfUrl = (slug: string) =>
  `${API_URL}/founder-cards/public/slug/${encodeURIComponent(slug)}/vcard.vcf`;
