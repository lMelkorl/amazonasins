const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const cheerio = require('cheerio');
const axios = require('axios')
const app = express();
const request = require('request');
const axiosRetry = require('axios-retry');

// axiosRetry(axios, { retries: 3 });

const connection = mysql.createConnection({
    host: '89.163.225.85',
    user: 'biggasin_deneme',
    password: 'Biig_@',
    database: 'biggasin_deneme',
});

connection.connect((error) => {
    if (error) {
        console.error('Bağlantı hatası:', error);
    } else {
        console.log('MySQL veritabanına bağlandı.');
    }
});

app.use(cors());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

app.use(express.json()); // Middleware for parsing JSON request bodies


app.get('/api/:magazaid/clearassins', (req, res) => {
    const magazaId = req.params.magazaid;

    // MySQL sorgusuyla asins tablosundan magaza_id'si :magazaid olan öğeyi sil
    const deleteQuery = 'DELETE FROM asins WHERE magaza_id = ?';

    connection.query(deleteQuery, [magazaId], (error, results) => {
        if (error) {
            console.error('Silme işlemi sırasında hata oluştu: ' + error.stack);
            res.status(500).send('Sunucu hatası');
            return;
        }

        // Silme işlemi başarılıysa başarılı yanıt döndür
        res.status(200).send('Öğe başarıyla silindi');
    });
});


app.get('/api/magazadurum0', (req, res) => {
    const query = "SELECT * FROM magazalar WHERE magaza_durum = 0";


    connection.query(query, (error, results) => {
        if (error) {
            res.status(500).json({ error: 'Veritabanı hatası' });
        } else {
            const magazalar = [];

            results.forEach(magaza => {
                if (magaza.magaza_durum === 0) {
                    const amazonUrl = `https://www.amazon.ca/s?me=${magaza.magaza_kodu}&marketplaceID=A2EUQ1WTGCTBG2`;
                    const magazaid = magaza.magaza_id;

                    magazalar.push({ amazonUrl, magazaid });
                }
            });
            // res.json({
            //     "magazalar": [
            //         {
            //             "amazonUrl": "https://www.amazon.ca/s?me=A2W8EY4J0UOJZR&marketplaceID=A2EUQ1WTGCTBG2",
            //             "magazaid": 3
            //         },

            //         {
            //             "amazonUrl": "https://www.amazon.ca/s?me=A32RV0G3HIJMY&marketplaceID=A2EUQ1WTGCTBG2",
            //             "magazaid": 4
            //         },
            //         // //2 si taranırken 3. magaza girildi
            //         {
            //             "amazonUrl": "https://www.amazon.ca/s?me=AFHWVC21LYEGQ&marketplaceID=A2EUQ1WTGCTBG2",
            //             "magazaid": 5
            //         },
            //     ]
            // });
            res.json({ magazalar })
        }
    });
});


// app.post('/api/add', (req, res) => {
//     const { asins_asin, magaza_id, count, start_time, end_time } = req.body;
//     // Veriyi veritabanına kaydedin
//     const query = 'INSERT INTO asins (asins_asin, magaza_id, count, start_time, end_time) VALUES (?, ?, ?, ?, ?)';
//     const values = [asins_asin, magaza_id, count, start_time, end_time];

//     connection.query(query, values, (err, result) => {
//         if (err) {
//             console.error('MySQL kayıt hatası: ' + err.stack);
//             res.sendStatus(500); // İşlem hatası yanıtı
//             return;
//         }

//         console.log('MySQL kaydı başarıyla eklendi', values);
//         res.sendStatus(200); // Başarılı yanıt
//     });

// });

app.post('/api/add', (req, res) => {
    const { asins_asin, magaza_id, count, start_time, end_time } = req.body;

    // Veriyi veritabanında güncelle veya ekle
    const checkQuery = 'SELECT * FROM asins WHERE magaza_id = ?';
    const checkValues = [magaza_id];

    connection.query(checkQuery, checkValues, (err, rows) => {
        if (err) {
            console.error('MySQL sorgu hatası: ' + err.stack);
            res.sendStatus(500); // İşlem hatası yanıtı
            return;
        }

        if (rows.length > 0) {
            // Kayıt mevcut, güncelle
            const updateQuery = 'UPDATE asins SET asins_asin = ?, count = ?, start_time = ?, end_time = ? WHERE magaza_id = ?';
            const updateValues = [asins_asin, count, start_time, end_time, magaza_id];

            connection.query(updateQuery, updateValues, (err, result) => {
                if (err) {
                    console.error('MySQL güncelleme hatası: ' + err.stack);
                    res.sendStatus(500); // İşlem hatası yanıtı
                    return;
                }

                console.log('MySQL kaydı başarıyla güncellendi', updateValues);
                res.sendStatus(200); // Başarılı yanıt
            });
        } else {
            // Kayıt mevcut değil, ekle
            const insertQuery = 'INSERT INTO asins (asins_asin, magaza_id, count, start_time, end_time) VALUES (?, ?, ?, ?, ?)';
            const insertValues = [asins_asin, magaza_id, count, start_time, end_time];

            connection.query(insertQuery, insertValues, (err, result) => {
                if (err) {
                    console.error('MySQL kayıt hatası: ' + err.stack);
                    res.sendStatus(500); // İşlem hatası yanıtı
                    return;
                }

                console.log('MySQL kaydı başarıyla eklendi');
                res.sendStatus(200); // Başarılı yanıt
            });
        }
    });
});

app.get('/api/editname/:magazaid/:isim', (req, res) => {
    const magazaId = req.params.magazaid;
    const isim = req.params.isim;

    const query = `SELECT * FROM magazalar WHERE magaza_kodu = '${magazaId}' LIMIT 1`;

    connection.query(query, (error, results, fields) => {
        if (error) {
            res.status(500).json({ error: 'Veritabanı hatası' });
            return;
        }

        if (results.length === 0) {
            res.status(404).json({ error: 'Mağaza bulunamadı' });
            return;
        }

        const magaza = results[0];
        magaza.magaza_ad = isim; // magaza_adı alanını güncelle

        // const updateQuery = `UPDATE magazalar SET magaza_ad = '${isim}' WHERE magaza_kodu = '${magazaId}'`;
        const updateQuery = `UPDATE magazalar SET magaza_ad = '${isim}', magaza_durum = 2 WHERE magaza_kodu = '${magazaId}'`;


        connection.query(updateQuery, (updateError, updateResults, updateFields) => {
            if (updateError) {
                res.status(500).json({ error: 'Veritabanı güncelleme hatası' });
                return;
            }

            res.json({ success: true, magaza });
        });
    });
});


app.get('/api/dudu', (req, res) => {
    const query = `SELECT * FROM asins`;

    connection.query(query, (error, results, fields) => {
        // console.log(results)
    })

})


app.listen(5000, () => {
    console.log('Sunucu çalışıyor, 5000 portunu dinliyor...');
});
