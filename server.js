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

// የምዝገባ ሁኔታዎችን ጊዜያዊ ማከማቻ (In-Memory Database)
const registrations = {};

// 1. አዲስ ምዝገባ ሲመጣ
app.post('/api/register', upload.any(), async (req, res) => {
    try {
        const userId = 'user_' + Date.now();
        registrations[userId] = { status: 'pending', data: req.body };

        let text = `📝 *አዲስ ምዝገባ ደርሷል*\n\n`;
        text += `🆔 *ID:* \`${userId}\`\n`;
        
        if (req.body) {
            for (const [key, value] of Object.entries(req.body)) {
                text += `• *${key}:* ${value}\n`;
            }
        }

        // ፅሁፉን ከነ Approve/Reject ቁልፎች ጋር መላክ
        await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '✅ አጽድቅ (Approve)', callback_data: `approve_${userId}` },
                        { text: '❌ ሰርዝ (Reject)', callback_data: `reject_${userId}` }
                    ]
                ]
            }
        });

        // ፎቶዎቹን መላክ
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const form = new FormData();
                form.append('chat_id', CHAT_ID);
                form.append('caption', `📷 ፎቶ (${file.fieldname}) - ID: ${userId}`);
                form.append('photo', file.buffer, { filename: file.originalname || 'photo.jpg' });

                await axios.post(
                    `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`,
                    form,
                    { headers: form.getHeaders() }
                );
            }
        }

        res.json({ success: true, userId: userId });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, message: 'ስህተት ተፈጥሯል' });
    }
});

// 2. የተጠቃሚውን ሁኔታ ማረጋገጫ (Check Status API)
app.get('/api/status/:userId', (req, res) => {
    const userId = req.params.userId;
    const user = registrations[userId];

    if (user) {
        res.json({ status: user.status });
    } else {
        res.json({ status: 'not_found' });
    }
});

// 3. ቴሌግራም ላይ አዝራር (Button) ሲጫን የሚሰራ Webhook/Polling handler
app.post('/api/telegram-webhook', async (req, res) => {
    try {
        const update = req.body;

        if (update.callback_query) {
            const callbackQuery = update.callback_query;
            const data = callbackQuery.data;
            const messageId = callbackQuery.message.message_id;
            const callbackQueryId = callbackQuery.id;

            if (data.startsWith('approve_')) {
                const userId = data.replace('approve_', '');
                if (registrations[userId]) registrations[userId].status = 'approved';

                // 1. ለቴሌግራምህ ማሳወቂያ (Popup/Toast) እንዲልክልህ
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: callbackQueryId,
                    text: '✅ ምዝገባው በስኬት ጸድቋል!'
                });

                // 2. በቴሌግራም ላይ ያለው መልእክት ላይ "APPROVED" ብሎ እንዲቀይረው
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                    chat_id: CHAT_ID,
                    message_id: messageId,
                    text: `${callbackQuery.message.text}\n\n✅ *ይህ ምዝገባ ተጽድቋል (Approved)*`,
                    parse_mode: 'Markdown'
                });

            } else if (data.startsWith('reject_')) {
                const userId = data.replace('reject_', '');
                if (registrations[userId]) registrations[userId].status = 'rejected';

                // 1. ለቴሌግራምህ ማሳወቂያ እንዲልክልህ
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                    callback_query_id: callbackQueryId,
                    text: '❌ ምዝገባው ተሰርዟል!'
                });

                // 2. በቴሌግራም ላይ ያለው መልእክት ላይ "REJECTED" ብሎ እንዲቀይረው
                await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
                    chat_id: CHAT_ID,
                    message_id: messageId,
                    text: `${callbackQuery.message.text}\n\n❌ *መረጃው የተሳሳተ ስለሆነ ተሰርዟል (Rejected)*`,
                    parse_mode: 'Markdown'
                });
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
