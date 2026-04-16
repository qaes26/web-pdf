const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
};

app.post('/api/pdf', async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid URL (e.g., https://example.com)' });
  }

  let browser;
  try {
    // Environment Check: Vercel vs Local
    if (process.env.VERCEL || process.env.AWS_REGION) {
      const chromium = require('@sparticuz/chromium');
      const puppeteerCore = require('puppeteer-core');
      
      browser = await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Using 'domcontentloaded' instead of 'networkidle2' is safer on Vercel to avoid the 10-second timeout limit
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width: 100%; font-size: 13px; font-weight: bold; padding-bottom: 10px; padding-top: 5px; color: #333; text-align: center; font-family: 'Arial', sans-serif;">
          إعداد قيس الجازي
        </div>
      `,
      margin: {
        top: '20px',
        bottom: '60px', 
        left: '20px',
        right: '20px'
      }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Puppeteer generation error:', error);
    res.status(500).json({ error: 'فشلت معالجة الرابط. قد يكون الموقع محمي أو تجاوز وقت الرد المسموح.' });
  }
});

// Important for Vercel: We must export the app instead of just listening
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`Server is running! Access the UI at http://localhost:${PORT}`);
  });
}
