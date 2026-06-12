const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 5000; 

app.use(cors());
app.use(express.json());

// MySQL Bağlantısı
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'ksk_db'
});

db.connect((err) => {
    if (err) return console.error('❌ MySQL Bağlantı Hatası:', err.message);
    console.log('🚀 XAMPP MySQL Veritabanına başarıyla bağlanıldı!');
});

// KULLANICI KAYIT VE GİRİŞ
app.post('/api/register', (req, res) => {
    console.log("Gelen veri:", req.body); // Terminalde veriyi görüp görmediğimizi kontrol etmek için
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
        return res.status(400).json({ success: false, message: 'Tüm alanları doldurunuz!' });
    }

    const sqlQuery = 'INSERT INTO users (name, phone, email, password) VALUES (?, ?, ?, ?)';
    db.query(sqlQuery, [name, phone, email, password], (err, result) => {
        if (err) {
            console.error("SQL Hatası:", err);
            return res.status(500).json({ success: false, message: 'Veritabanı hatası!' });
        }
        res.json({ success: true, message: 'Kayıt başarılı!' });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sqlQuery = 'SELECT * FROM users WHERE email = ? AND password = ?';
    db.query(sqlQuery, [email, password], (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false, message: 'Hatalı giriş!' });
        res.json({ success: true, name: results[0].name });
    });
});

// REZERVASYONLAR
app.post('/api/reservations', (req, res) => {
    const { fieldKey, dateText, hourText, user_name } = req.body;
    const sqlQuery = 'INSERT INTO reservations (fieldKey, dateText, hourText, user_name) VALUES (?, ?, ?, ?)';
    db.query(sqlQuery, [fieldKey, dateText, hourText, user_name], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Hata!' });
        res.json({ success: true });
    });
});

app.get('/api/reservations', (req, res) => {
    db.query('SELECT * FROM reservations', (err, results) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: results });
    });
});

// =======================================================
// 📢 YENİ: FORUM İLANLARI API'Sİ
// =======================================================
// Yeni ilan ekleme
app.post('/api/forum', (req, res) => {
    console.log("Rezervasyon isteği alındı:", req.body);
    const { dateText, hourText, position, payment, phone, msg } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Telefon zorunlu!' });

    const sqlQuery = 'INSERT INTO forum_posts (dateText, hourText, position, payment, phone, msg) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(sqlQuery, [dateText, hourText, position, payment, phone, msg], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'İlan kaydedilemedi!' });
        res.json({ success: true, message: 'İlan başarıyla eklendi!' });
    });
});

// Tüm ilanları çekme (En yeniden eskiye doğru sıralı)
app.get('/api/forum', (req, res) => {
    const sqlQuery = 'SELECT * FROM forum_posts ORDER BY created_at DESC';
    db.query(sqlQuery, (err, results) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, data: results });
    });
});

app.listen(port, () => {
    console.log(`⚡ Arka plan sunucusu http://127.0.0.1:${port} adresinde çalışıyor!`);
});