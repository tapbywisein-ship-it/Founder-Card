import { Router } from 'express';
import ogController from './og.controller';

/**
 * Two routers:
 *   - imageRouter mounted under `/api/v1/og/*.png` — returns image/png
 *   - htmlRouter  mounted under `/og/*` — returns text/html with OG tags
 *
 * They're separate so the API base path stays consistent for image fetches
 * while crawlers can hit clean root URLs.
 */
export const ogImageRouter = Router();
ogImageRouter.get('/card/:slug', ogController.cardImage.bind(ogController));
ogImageRouter.get('/event/:id', ogController.eventImage.bind(ogController));

export const ogHtmlRouter = Router();
ogHtmlRouter.get('/c/:slug', ogController.cardHtml.bind(ogController));
ogHtmlRouter.get('/e/:id', ogController.eventHtml.bind(ogController));
