import { Request, Response } from 'express';
import seoService from './seo.service';

export class SeoController {
  async sitemap(_req: Request, res: Response): Promise<void> {
    const xml = await seoService.generateSitemap();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(xml);
  }
}

export default new SeoController();
