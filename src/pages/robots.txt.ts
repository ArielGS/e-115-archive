// /robots.txt: the whole site may be crawled; tells crawlers where the sitemap is.
import type { APIRoute } from 'astro';
import { url } from '../lib/site';
import { robotsTxt } from '../lib/seo';

export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt(new URL(url('/sitemap.xml'), site).href), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
