import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('SEO, Crawler & Indexing Validation', () => {
  const rootDir: string = path.resolve(__dirname, '../../');
  const robotsPath: string = path.join(rootDir, 'public/robots.txt');
  const sitemapPath: string = path.join(rootDir, 'public/sitemap.xml');
  const indexPath: string = path.join(rootDir, 'index.html');

  it('provides a valid plain-text robots.txt file with required crawler directives', () => {
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content: string = fs.readFileSync(robotsPath, 'utf-8');

    // Crucial: Must NOT contain HTML tags that cause 21 crawler syntax errors
    expect(content.includes('<!DOCTYPE')).toBe(false);
    expect(content.includes('<html')).toBe(false);
    expect(content.includes('<head')).toBe(false);

    // Standard valid robots directives
    expect(content).toMatch(/User-agent:\s*\*/i);
    expect(content).toMatch(/Allow:\s*\//i);
    expect(content).toMatch(/Sitemap:\s*https:\/\/bassistant\.pages\.dev\/sitemap\.xml/i);
  });

  it('provides a valid sitemap.xml file referencing the canonical location', () => {
    expect(fs.existsSync(sitemapPath)).toBe(true);
    const content: string = fs.readFileSync(sitemapPath, 'utf-8');

    expect(content.startsWith('<?xml')).toBe(true);
    expect(content.includes('<urlset')).toBe(true);
    expect(content.includes('https://bassistant.pages.dev/')).toBe(true);
    expect(content.includes('</urlset>')).toBe(true);
  });

  it('includes required meta description, canonical link, and theme color in index.html', () => {
    expect(fs.existsSync(indexPath)).toBe(true);
    const html: string = fs.readFileSync(indexPath, 'utf-8');

    // Meta description tag
    const descMatch: RegExpMatchArray | null = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    expect(descMatch).not.toBeNull();
    const description: string = descMatch![1];
    expect(description.length).toBeGreaterThan(20);
    expect(description.length).toBeLessThanOrEqual(160);

    // Canonical link
    expect(html).toContain('<link rel="canonical" href="https://bassistant.pages.dev/" />');

    // Theme color
    expect(html).toContain('<meta name="theme-color" content="#fffdf7" />');
  });

  it('includes complete Open Graph and Twitter Card tags in index.html', () => {
    const html: string = fs.readFileSync(indexPath, 'utf-8');

    // Open Graph
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:url" content="https://bassistant.pages.dev/" />');
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('<meta property="og:description"');
    expect(html).toContain('<meta property="og:image"');

    // Twitter Card
    expect(html).toContain('<meta name="twitter:card" content="summary" />');
    expect(html).toContain('<meta name="twitter:url" content="https://bassistant.pages.dev/" />');
    expect(html).toContain('<meta name="twitter:title"');
    expect(html).toContain('<meta name="twitter:description"');
    expect(html).toContain('<meta name="twitter:image"');
  });

  it('includes JSON-LD WebApplication schema in index.html', () => {
    const html: string = fs.readFileSync(indexPath, 'utf-8');
    const jsonLdMatch: RegExpMatchArray | null = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    expect(jsonLdMatch).not.toBeNull();

    const parsedJson: Record<string, unknown> = JSON.parse(jsonLdMatch![1]);
    expect(parsedJson['@context']).toBe('https://schema.org');
    expect(parsedJson['@type']).toBe('WebApplication');
    expect(parsedJson.name).toBe('bAssistant');
    expect(parsedJson.url).toBe('https://bassistant.pages.dev/');
  });

  it('includes semantic noscript fallback content in index.html for crawlers', () => {
    const html: string = fs.readFileSync(indexPath, 'utf-8');
    expect(html).toContain('<noscript>');
    expect(html).toContain('</noscript>');
    expect(html).toContain('bAssistant — In-Browser AI Workspace');
    expect(html).toContain('20/80 Cockpit Layout');
    expect(html).toContain('17 Zero-Install WebMCP Tools');
  });
});
