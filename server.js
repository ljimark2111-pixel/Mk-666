const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.post('/api/register', async (req, res) => {
    try {
        const { name, phone } = req.body;
        const text = `📝 *አዲስ ምዝገባ*\n\n👤 *ስም:* ${name}\n📞 *ስልክ:* ${phone}`;

        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'Markdown'
        });

        res.json({ success: true, message: 'ምዝገባው ተሳክቷል!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'ስህተት ተፈጥሯል' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

