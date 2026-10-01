import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getSiteContent } from './restaurant.service';

// Site content changes only when someone edits the restaurant row, which is rare
// and not a customer-facing flow in the MVP. A short public max-age lets the
// CDN/browser absorb the repeat hits this endpoint takes on every page load,
// while the 60s stale-while-revalidate window keeps an edit from taking minutes
// to appear.
const SITE_CONTENT_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

export async function getSiteContentController(_req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', SITE_CONTENT_CACHE_CONTROL);
  sendSuccess(res, await getSiteContent());
}