const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { neon } = require('@neondatabase/serverless');

const dev = process.env.NODE_NODE !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// ربط قاعدة البيانات
const sql = neon(process.env.DATABASE_URL);

app.prepare().then(() => {
  createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // برمجة استقبال البيانات وحفظها (نظام المساعدات)
    if (pathname === '/api/save' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        const data = JSON.parse(body);
        try {
          // حساب رقم الكرت التلقائي
          const lastCard = await sql`SELECT MAX(card_number) as max FROM "AidRecord" WHERE committee = ${data.committee}`;
          const nextCard = (lastCard[0].max || 0) + 1;

          await sql`INSERT INTO "AidRecord" (year, committee, card_number, beneficiary_name, quantity, id_number, phone_number) 
                    VALUES (${data.year}, ${data.committee}, ${nextCard}, ${data.beneficiary_name}, ${data.quantity}, ${data.id_number}, ${data.phone_number})`;
          
          res.end(JSON.stringify({ success: true, card: nextCard }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "تكرار في البيانات" }));
        }
      });
    } else {
      handle(req, res, parsedUrl);
    }
  }).listen(3000);
});
