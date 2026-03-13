const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

// ربط قاعدة البيانات باستخدام الرابط الذي وضعناه في الإعدادات
const sql = neon(process.env.DATABASE_URL);

createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // 1. عرض صفحة الواجهة عند فتح الموقع
    if (pathname === '/' || pathname === '/index.html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(fs.readFileSync('./index.html'));
    } 

    // 2. استقبال البيانات وحفظها في قاعدة البيانات
    else if (pathname === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);

                // حساب رقم الكرت التلقائي (آخر رقم لنفس اللجنة + 1)
                const lastCard = await sql`
                    SELECT MAX(card_number) as max_val 
                    FROM "AidRecord" 
                    WHERE committee = ${data.committee}
                `;
                const nextCard = (lastCard[0].max_val || 0) + 1;

                // إدخال البيانات في الجدول
                await sql`
                    INSERT INTO "AidRecord" (
                        year, committee, card_number, beneficiary_name, 
                        unit, quantity, id_number, phone_number
                    ) VALUES (
                        ${data.year}, ${data.committee}, ${nextCard}, ${data.beneficiary_name}, 
                        ${data.unit}, ${data.quantity}, ${data.id_number}, ${data.phone_number}
                    )
                `;

                res.end(JSON.stringify({ success: true, card: nextCard }));
            } catch (err) {
                console.error(err);
                res.statusCode = 500;
                // إرسال تنبيه في حال تكرار الاسم أو الهوية أو الجوال
                res.end(JSON.stringify({ success: false, error: "فشل الحفظ: قد يكون الاسم أو الهوية أو الجوال مسجلاً مسبقاً" }));
            }
        });
    }
}).listen(3000);
