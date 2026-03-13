const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

// التأكد من وجود رابط قاعدة البيانات
const databaseUrl = process.env.DATABASE_URL;

const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // 1. عرض الواجهة
    if (pathname === '/' || pathname === '/index.html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        try {
            const html = fs.readFileSync('./index.html');
            res.end(html);
        } catch (e) {
            res.end("برجاء التأكد من وجود ملف index.html");
        }
    } 
    // 2. معالجة البيانات
    else if (pathname === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                if (!databaseUrl) throw new Error("رابط قاعدة البيانات غير مضبوط");
                const sql = neon(databaseUrl);
                const data = JSON.parse(body);

                const lastCard = await sql`SELECT MAX(card_number) as max_val FROM "AidRecord" WHERE committee = ${data.committee}`;
                const nextCard = (lastCard[0].max_val || 0) + 1;

                await sql`INSERT INTO "AidRecord" (year, committee, card_number, beneficiary_name, unit, quantity, id_number, phone_number) 
                          VALUES (${data.year}, ${data.committee}, ${nextCard}, ${data.beneficiary_name}, ${data.unit}, ${data.quantity}, ${data.id_number}, ${data.phone_number})`;

                res.end(JSON.stringify({ success: true, card: nextCard }));
            } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    } else {
        res.statusCode = 404;
        res.end();
    }
});

server.listen(3000);
