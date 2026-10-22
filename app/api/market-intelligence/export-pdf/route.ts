import { renderExecutiveReport, type ExecutiveReportData } from '@/templates/executive-report';

export const maxDuration = 60; // Batas Vercel Hobby

async function bukaBrowser() {
  if (process.env.VERCEL) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const { launch, defaultArgs } = await import('puppeteer-core');
    return launch({
      args: await defaultArgs({ args: chromium.args, headless: 'shell' }),
      executablePath: await chromium.executablePath(),
      headless: 'shell',
    });
  }

  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch({ headless: true });
}

export async function POST(req: Request) {
  try {
    const data: ExecutiveReportData = await req.json().catch(() => null);
    if (!data || !Array.isArray(data.outlets)) {
      return Response.json({ error: 'Data laporan eksekutif tidak valid.' }, { status: 400 });
    }

    const html = renderExecutiveReport(data);

    let browser;
    try {
      browser = await bukaBrowser();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      const fileNameDate = data.publishDate || new Date().toISOString().split('T')[0];
      return new Response(pdf as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'X-Filename': `Laporan_Eksekutif_Intelijen_Pasar_Sanghyang_${fileNameDate}.pdf`,
          'Cache-Control': 'no-store',
        },
      });
    } finally {
      await browser?.close();
    }
  } catch (error) {
    console.error('[Export PDF] Gagal membuat PDF:', error);
    return Response.json({ error: `Gagal membuat PDF: ${(error as Error).message}` }, { status: 500 });
  }
}

