// Phase 2.5: PublicEventPage and the authenticated EventDetail page were merged
// into a single unified component. This file re-exports it so existing imports
// continue to work; the component itself decides chrome based on auth state.
export { default } from './EventDetailUnified';
