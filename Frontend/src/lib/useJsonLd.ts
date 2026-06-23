import { useEffect } from 'react';

/**
 * Injects a <script type="application/ld+json"> into <head> while mounted, so
 * client-rendered SPA routes expose Schema.org structured data (Event, Person)
 * for crawlers that execute JS. Pass null to emit nothing.
 */
export function useJsonLd(data: Record<string, unknown> | null | undefined): void {
  const serialized = data ? JSON.stringify(data) : '';
  useEffect(() => {
    if (!serialized) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = serialized;
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [serialized]);
}
