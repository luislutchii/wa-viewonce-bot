const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message) return;

        const type = Object.keys(msg.message)[0];
        let isViewOnce = type === 'viewOnceMessage' || type === 'viewOnceMessageV2';
        
        if (isViewOnce) {
            console.log('\n[!] Mídia de visualização única detectada! Revelando...');

            const viewOnceContent = msg.message[type].message;
            const mediaType = Object.keys(viewOnceContent)[0]; // imageMessage ou videoMessage
            const mediaMessage = viewOnceContent[mediaType];

            // Baixa o arquivo dos servidores do WhatsApp
            const stream = await downloadContentFromMessage(mediaMessage, mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const caption = `🔓 Mídia revelada!\n\nLegenda original: ${mediaMessage.caption || 'Nenhuma'}`;

            // Envia de volta no chat atual (seja privado ou grupo)
            if (mediaType === 'imageMessage') {
                await sock.sendMessage(msg.key.remoteJid, { image: buffer, caption: caption }, { quoted: msg });
            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(msg.key.remoteJid, { video: buffer, caption: caption }, { quoted: msg });
            }
            console.log('[+] Mídia enviada com sucesso!\n');
        }
    });
}

connectToWhatsApp();
