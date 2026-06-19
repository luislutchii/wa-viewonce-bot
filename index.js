const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
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
        if (!msg.message || msg.key.fromMe) return;

        // 1. Verificar se a mensagem vem de um chat privado (ignora se terminar com @g.us)
        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        if (isGroup) return;

        const type = Object.keys(msg.message)[0];
        let isViewOnce = type === 'viewOnceMessage' || type === 'viewOnceMessageV2';
        
        if (isViewOnce) {
            console.log('\n[!] Mídia de visualização única detectada em chat privado!');

            const viewOnceContent = msg.message[type].message;
            const mediaType = Object.keys(viewOnceContent)[0]; // imageMessage ou videoMessage
            const mediaMessage = viewOnceContent[mediaType];

            console.log(`[~] Baixando ${mediaType === 'imageMessage' ? 'imagem' : 'vídeo'}...`);

            // Baixa o arquivo dos servidores do WhatsApp
            const stream = await downloadContentFromMessage(mediaMessage, mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Descobre o JID (número) do próprio Bot conectado
            const myJid = jidNormalizedUser(sock.user.id);
            
            // Descobre quem enviou a mídia para colocar na legenda
            const senderNumber = msg.key.participant || msg.key.remoteJid;
            const senderClean = senderNumber.split('@')[0];

            const caption = `🔓 *Mídia Revelada Privada*\n\n👤 *Enviado por:* @${senderClean}\n📝 *Legenda:* ${mediaMessage.caption || 'Nenhuma'}`;

            console.log('[~] Enviando mídia revelada para o seu chat privado...');

            // 2. Envia a mídia SEMPRE para o próprio número conectado
            if (mediaType === 'imageMessage') {
                await sock.sendMessage(myJid, { image: buffer, caption: caption, mentions: [senderNumber] });
            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(myJid, { video: buffer, caption: caption, mentions: [senderNumber] });
            }
            console.log('[+] Revelação enviada com sucesso para você!\n');
        }
    });
}

connectToWhatsApp();
