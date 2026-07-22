const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ፎቶዎችን እና ፅሁፎችን በአንድ ላይ ለመቀበል
app.post('/api/register', upload.any(), async (req, res) => {
    try {
        // 1. የፅሁፍ መረጃዎችን ማዘጋጀት
        let text = `📝 *አዲስ ምዝገባ*\n\n`;
        for (const key of Object.keys(req.body)) {
            text += `• *${key}:* ${req.body[key]}\n`;
        }

        // መጀመሪያ ፅሁፉን መላክ
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });

        // 2. የተላኩ ፎቶዎች ካሉ እያንዳንዳቸውን ወደ ቴሌግራም መላክ
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const formData = new FormData();
                formData.append('chat_id', CHAT_ID);
                formData.append('caption', `📷 የተላከ ፎቶ (${file.fieldname})`);
                formData.append('photo', file.buffer, { filename: file.originalname });

                await axios.post(
                    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
                    formData,
                    { headers: formData.getHeaders() }
                );
            }
        }

        res.json({ success: true, message: 'ምዝገባው በስኬት ተጠናቋል!' });
    } catch (error) {
        console.error('Error sending to Telegram:', error.message);
        res.status(500).json({ success: false, message: 'መረጃውን መላክ አልተቻለም' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
