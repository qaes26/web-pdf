const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');

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
    // Pure Puppeteer Execution - Guaranteed to work in our Docker environment
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

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
    res.status(500).json({ error: `فشلت معالجة الرابط. قد يكون الموقع محمي أو ثقيل جداً.\nالسبب التقني: ${error.message}` });
  }
});

// App Listener
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running! Access the UI at http://0.0.0.0:${PORT}`);
});
