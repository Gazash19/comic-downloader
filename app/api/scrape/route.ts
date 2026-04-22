import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { url } = body;

    if (!url) return NextResponse.json({ error: 'URL/Kode kosong!' }, { status: 400 });

    url = url.trim();
    if (/^\d+$/.test(url)) {
      url = `https://hentairun.com/gallery/${url}/`;
    } else if (url.includes('hentairun.com/view/')) {
      const match = url.match(/\/view\/(\d+)/);
      if (match) url = `https://hentairun.com/gallery/${match[1]}/`;
    }

    // Memanggil Chrome versi utuh (Cocok untuk Railway)
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const smartData = await page.evaluate(() => {
      if (window.location.href.includes('hentairun.com/gallery/')) {
        const bodyText = document.body.innerText;
        const match = bodyText.match(/Pages:?[\s\n]*(\d+)/i);
        const pages = match ? parseInt(match[1]) : 0;
        const metaImg = document.querySelector('meta[property="og:image"]');
        const ogImage = metaImg ? metaImg.getAttribute('content') : null;

        if (pages > 0 && ogImage) {
          let baseUrl = ogImage.replace('t.hentairun', 'i.hentairun').replace(/cover\.(jpg|png|webp)/, '');
          if (!baseUrl.endsWith('/')) baseUrl = baseUrl.split('/').slice(0, -1).join('/') + '/';
          let imgs = [];
          for (let i = 1; i <= pages; i++) imgs.push(baseUrl + i + '.jpg');
          return { title: document.title.replace(' - HentaiRun', '').trim(), images: imgs, coverUrl: ogImage };
        }
      }
      return null;
    });

    if (smartData) {
       await browser.close();
       return NextResponse.json({ success: true, data: { ...smartData, totalPages: smartData.images.length } });
    }

    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalH = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 300);
          totalH += 300;
          if (totalH >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
        }, 150);
      });
    });
    
    await new Promise(r => setTimeout(r, 2000));
    const imageUrls = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .map(img => img.getAttribute('data-src') || img.src)
        .filter(src => src?.startsWith('http') && !src.includes('logo'));
    });
    const title = await page.title();
    await browser.close();
    
    return NextResponse.json({ success: true, data: { title: title || 'Comic', images: [...new Set(imageUrls)], totalPages: [...new Set(imageUrls)].length, coverUrl: imageUrls[0] }});
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}