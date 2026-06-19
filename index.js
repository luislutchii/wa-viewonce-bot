const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, jidNormalizedUser, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

async function connectToWhatsApp() {
    // Força o uso do estado de autenticação estruturado
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    console.log('[~] Inicializando socket do WhatsApp...');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'error' }), // Mostra apenas erros críticos no console
        printQRInTerminal: true,          // Garante a renderização do QR Code no Termux
        browser: ['LES BOT', 'Safari', '3.0'] // Define um navegador válido para evitar rejeição
    });

    // Salva as credenciais sempre que houver atualização
    sock.ev.on('creds.update', saveCreds);

    // Escuta mudanças no status da conexão
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n[!] NOVO QR CODE GERADO! Escaneie abaixo:\n');
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            
            console.log('[!] Conexão fechada devido a:', lastDisconnect?.error, '. Reconectando:', shouldReconnect);
            
            if (shouldReconnect) {
                connectToWhatsApp(); // Força a reconexão automática
            }
        } else if (connection === 'open') {
            console.log('\n[+] BOT CONECTADO COM SUCESSO!\n');
        }
    });

    // Escuta as mensagens recebidas
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        if (isGroup) return;

        const type = Object.keys(msg.message)[0];
        let isViewOnce = type === 'viewOnceMessage' || type === 'viewOnceMessageV2';
        
        if (isViewOnce) {
            console.log('\n[!] Mídia de visualização única detectada!');
            try {
                const viewOnceContent = msg.message[type].message;
                const mediaType = Object.keys(viewOnceContent)[0];
                const mediaMessage = viewOnceContent[mediaType];

                console.log(`[~] Baixando buffer do arquivo...`);
                const stream = await downloadContentFromMessage(mediaMessage, mediaType.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                const myJid = jidNormalizedUser(sock.user.id);
                const senderNumber = msg.key.participant || msg.key.remoteJid;
                const senderClean = senderNumber.split('@')[0];
                const caption = `🔓 *Mídia Revelada Privada*\n\n👤 *Enviado por:* @${senderClean}\n📝 *Legenda:* ${mediaMessage.caption || 'Nenhuma'}`;

                if (mediaType === 'imageMessage') {
                    await sock.sendMessage(myJid, { image: buffer, caption: caption, mentions: [senderNumber] });
                } else if (mediaType === 'videoMessage') {
                    await sock.sendMessage(myJid, { video: buffer, caption: caption, mentions: [senderNumber] });
                }
                console.log('[+] Revelação enviada para o seu privado!\n');
            } catch (err) {
                console.error('[-] Erro ao processar mídia:', err);
            }
        }
    });
}

connectToWhatsApp().catch(err => console.error('[-------] Erro Crítico na Inicialização:', err));
