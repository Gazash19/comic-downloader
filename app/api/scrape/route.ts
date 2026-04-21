import { NextResponse } from 'next/server';
import puppeteerCore from 'puppeteer-core'; 
// @ts-ignore
import chromium from '@sparticuz/chromium';

export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) return NextResponse.json({ error: 'URL kosong!' }, { status: 400 });

    let browser;
    if (process.env.NODE_ENV === 'production') {
      // 🚀 INI DIA MANTRA PERBAIKANNYA:
      const chrom = chromium as any;
      browser = await puppeteerCore.launch({
        args: chrom.args, 
        defaultViewport: chrom.defaultViewport,
        executablePath: await chrom.executablePath(), 
        headless: chrom.headless,
      });
    } else {
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'], 
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const smartBypassData = await page.evaluate(() => {
      const currentUrl = window.location.href;
      
      if (currentUrl.includes('hentairun.com/gallery/')) {
        const bodyText = document.body.innerText;
        const match = bodyText.match(/Pages:?[\s\n]*(\d+)/i);
        const pages = match ? parseInt(match[1]) : 0;

        const metaImage = document.querySelector('meta[property="og:image"]');
        const ogImage = metaImage ? metaImage.getAttribute('content') : null;

        if (pages > 0 && ogImage) {
          let baseUrl = ogImage.replace('t.hentairun', 'i.hentairun')
                               .replace('cover.jpg', '')
                               .replace('cover.png', '')
                               .replace('cover.webp', '');
                               
          if (!baseUrl.endsWith('/')) baseUrl = baseUrl.split('/').slice(0, -1).join('/') + '/';

          let images = [];
          for (let i = 1; i <= pages; i++) {
             images.push(baseUrl + i + '.jpg');
          }

          return {
             title: document.title.replace(' - HentaiRun', '').trim(),
             images: images,
             coverUrl: ogImage
          };
        }
      }
      return null;
    });

    if (smartBypassData) {
       await browser.close();
       return NextResponse.json({
         success: true,
         data: {
           title: smartBypassData.title,
           totalPages: smartBypassData.images.length,
           images: smartBypassData.images,
           coverUrl: smartBypassData.coverUrl
         }
       });
    }

    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) { clearInterval(timer); resolve(); }
        }, 150);
      });
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const imageUrls = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images
        .map(img => img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src)
        .filter(src => src && src.startsWith('http'))
        .filter(src => !src?.includes('logo') && !src?.includes('banner') && !src?.includes('avatar'));
    });

    const uniqueImages = [...new Set(imageUrls)];
    const title = await page.title();
    await browser.close();

    return NextResponse.json({
      success: true,
      data: {
        title: title || 'Unknown Chapter',
        totalPages: uniqueImages.length,
        images: uniqueImages,
        coverUrl: uniqueImages[0] || null
      }
    });

  } catch (error) {
    console.error("Scrape Error:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}