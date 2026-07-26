/** Shared scroll-reveal motion for marketing pages — smooth "ease-out-expo"
 * decel curve reads as premium; default framer-motion easing feels flatter. */
export const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const;

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '200px' },
  transition: { duration: 0.6, delay, ease: EASE_PREMIUM },
});
