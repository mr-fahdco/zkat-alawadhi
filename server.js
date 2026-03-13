const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// الإعدادات الأساسية
const PORT = process.env.PORT || 3000;
const databaseUrl = process.env.DATABASE_URL;

const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // 1. عرض واجهة المستخدم
    if (pathname === '/' || pathname === '/index.html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        try {
            const filePath = path.join(process.cwd(), 'index.html');
            const html = fs.readFileSync(filePath);
            res.end(html);
        } catch (e) {
            res.statusCode = 500;
            res.end("خطأ: لم يتم العثور على ملف index.html");
        }
    } 
    
    // 2. استقبال وحفظ البيانات
    else if (pathname === '/api/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
                if (!databaseUrl) {
                    throw new Error("رابط قاعدة البيانات (DATABASE_URL) غير مضاف في Vercel");
                }

                // الربط الآمن بقاعدة البيانات
                const connectionString = databaseUrl.includes('?') ? databaseUrl : `${databaseUrl}?sslmode=require`;
                const sql = neon(connectionString);
                
                const data = JSON.parse(body);

                // حساب رقم الكرت التلقائي (أكبر رقم في اللجنة + 1)
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
                        ${data.year}, ${data.committee}, ${nextCard}, 
                        ${data.beneficiary_name}, ${data.unit}, ${data.quantity}, 
                        ${data.id_number}, ${data.phone_number}
                    )
                `;

                res.end(JSON.stringify({ success: true, card: nextCard }));

            } catch (err) {
                console.error("Database Error:", err);
                res.statusCode = 500;
                // إرسال رسالة خطأ واضحة للمستخدم
                let errorMsg = "فشل في قاعدة البيانات";
                if (err.message.includes("unique constraint")) {
                    errorMsg = "خطأ: الاسم أو الهوية أو الجوال مسجل مسبقاً!";
                } else if (err.message.includes("DATABASE_URL")) {
                    errorMsg = "خطأ: لم يتم ربط قاعدة البيانات بموقع Vercel";
                }
                res.end(JSON.stringify({ success: false, error: errorMsg }));
            }
        });
    } else {
        res.statusCode = 404;
        res.end("Page Not Found");
    }
});

// تشغيل الخادم
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
