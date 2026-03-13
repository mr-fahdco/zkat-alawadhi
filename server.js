const express = require('express');
const { Pool } = require('pg');
const app = express();

// الربط مع قاعدة البيانات التي زودتني بها
const pool = new Pool({
  connectionString: 'postgresql://postgres:password@helium/heliumdb?sslmode=disable'
});

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()'); // اختبار الاتصال
    res.send('✅ تطبيق المساعدات الإنسانية يعمل ومتصل بقاعدة البيانات! وقت الخادم: ' + result.rows[0].now);
  } catch (err) {
    res.status(500).send('❌ خطأ في الاتصال بقاعدة البيانات');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App running on port ${PORT}`));
