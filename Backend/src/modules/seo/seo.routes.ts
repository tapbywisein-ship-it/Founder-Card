import { Router } from 'express';
import seoController from './seo.controller';

const router = Router();

// Public XML sitemap (nginx proxies /sitemap.xml here).
router.get('/sitemap.xml', seoController.sitemap.bind(seoController));

export default router;
