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

app.post('/api/register', upload.any(), async (req, res) => {
    try {
        // 1. የጽሁፍ መረጃዎችን ማዘጋጀት
        let text = `📝 *አዲስ ምዝገባ ደርሷል*\n\n`;
        
        if (req.body && Object.keys(req.body).length > 0) {
            for (const [key, value] of Object.entries(req.body)) {
                text += `• *${key}:* ${value}\n`;
            }
        } else {
            text += `⚠️ ምንም የጽሁፍ መረጃ አልተላከም።`;
        }

        // ፅሁፉን መላክ
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });

        // 2. ፎቶዎችን መላክ
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const form = new FormData();
                form.append('chat_id', CHAT_ID);
                form.append('caption', `📷 ፎቶ: ${file.fieldname}`);
                form.append('photo', file.buffer, { filename: file.originalname || 'photo.jpg' });

                await axios.post(
                    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
                    form,
                    { headers: form.getHeaders() }
                );
            }
        }

        res.json({ success: true, message: 'ምዝገባው ተሳክቷል!' });
    } catch (error) {
        console.error('Error Details:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'ስህተት ተፈጥሯል' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
