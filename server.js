const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// استخدام المنفذ الذي توفره المنصة أو 3000 كافتراضي
const PORT = process.env.PORT || 3000;
const databaseUrl = process.env.DATABASE_URL;

const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // 1. عرض الواجهة (تأكد أن اسم الملف index.html في GitHub)
    if (pathname === '/' || pathname === '/index.html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        try {
            const filePath = path.join(process.cwd(), 'index.html');
            const html = fs.readFileSync(filePath);
            res.end(html);
        } catch (e) {
            res.statusCode = 500;
            res.end("خطأ: لم يتم العثور على ملف index.html في المجلد الرئيسي");
        }
    } 
    // 2. معالجة وحفظ البيانات
    else if (pathname === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
                if (!databaseUrl) throw new Error("رابط قاعدة البيانات (DATABASE_URL) غير مضاف في الإعدادات");
                
                const sql = neon(databaseUrl);
                const data = JSON.parse(body);

                // حساب رقم الكرت التلقائي
                const lastCard = await sql`SELECT MAX(card_number) as max_val FROM "AidRecord" WHERE committee = ${data.committee}`;
                const nextCard = (lastCard[0].max_val || 0) + 1;

                // إدخال البيانات
                await sql`INSERT INTO "AidRecord" (year, committee, card_number, beneficiary_name, unit, quantity, id_number, phone_number) 
                          VALUES (${data.year}, ${data.committee}, ${nextCard}, ${data.beneficiary_name}, ${data.unit}, ${data.quantity}, ${data.id_number}, ${data.phone_number})`;

                res.end(JSON.stringify({ success: true, card: nextCard }));
            } catch (err) {
                console.error(err);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: "فشل الحفظ: تأكد من عدم تكرار الاسم أو رقم الهوية" }));
            }
        });
    } else {
        res.statusCode = 404;
        res.end("Page Not Found");
    }
});

// البدء في الاستماع للمنفذ
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
