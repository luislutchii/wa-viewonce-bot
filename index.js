const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const readline = require('readline');

// ============================================================
//  📌 CONFIGURAÇÃO
// ============================================================
const NUMERO_DESTINO_PV = '244924319522'; // ⚠️ ALTERE AQUI: número onde o .rvftpv enviará as revelações (com código do país, sem +)

// ============================================================
//  🎨 CORES ANSI
// ============================================================
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    gray: "\x1b[90m",
};

// ============================================================
//  🖼️  BANNER
// ============================================================
function exibirBanner() {
    console.clear();
    console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.cyan}║                                                              ║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.magenta}██╗     ███████╗███████╗    ██████╗  ██████╗ ████████╗     ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.magenta}██║     ██╔════╝██╔════╝    ██╔══██╗██╔═══██╗╚══██╔══╝     ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.magenta}██║     █████╗  ███████╗    ██████╔╝██║   ██║   ██║        ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.magenta}██║     ██╔══╝  ╚════██║    ██╔══██╗██║   ██║   ██║        ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.magenta}███████╗███████╗███████║    ██████╔╝╚██████╔╝   ██║        ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.magenta}╚══════╝╚══════╝╚══════╝    ╚═════╝  ╚═════╝    ╚═╝        ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║                                                              ║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.yellow}👑 Dono:${C.white} Luís Lutchi        ${C.yellow}📸 Insta:${C.white} @luislutchii          ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.green}▶ Comandos:${C.reset}                                               ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.white}  .rvft${C.reset}   → revela e envia no chat atual                    ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.white}  .rvftpv${C.reset}  → revela e envia para o número configurado      ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}║   ${C.gray}  (destino atual: ${NUMERO_DESTINO_PV})${C.reset}                            ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);
}

// ============================================================
//  🧠  FUNÇÕES AUXILIARES
// ============================================================
function extrairConteudoReal(message) {
    if (!message) return null;
    if (message.viewOnceMessage) return extrairConteudoReal(message.viewOnceMessage.message);
    if (message.viewOnceMessageV2) return extrairConteudoReal(message.viewOnceMessageV2.message);
    if (message.viewOnceMessageV2Extension) return extrairConteudoReal(message.viewOnceMessageV2Extension.message);
    if (message.ephemeralMessage) return extrairConteudoReal(message.ephemeralMessage.message);
    if (message.imageMessage || message.videoMessage) return message;
    return message;
}

async function carregarMensagem(sock, jid, messageId) {
    try {
        if (typeof sock.loadMessage === 'function') {
            const loaded = await sock.loadMessage(jid, messageId);
            if (loaded && loaded.message) return loaded.message;
        }
        if (typeof sock.getMessages === 'function') {
            const msgs = await sock.getMessages(jid, [messageId]);
            if (msgs && msgs.length > 0 && msgs[0].message) return msgs[0].message;
        }
        return null;
    } catch (_) { return null; }
}

// ============================================================
//  🔌  CONEXÃO PRINCIPAL
// ============================================================
async function connectToWhatsApp() {
    exibirBanner();
    console.log(`${C.cyan}${C.bold}[~]${C.reset} Inicializando...\n`);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome')
    });

    // ── Pareamento ──────────────────────────────────────────────
    if (!sock.authState.creds.registered) {
        console.log(`${C.yellow}[!] Credenciais não encontradas. Pareamento via terminal ativado.${C.reset}`);
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const question = (text) => new Promise(resolve => rl.question(text, resolve));
        let phoneNumber = await question(`${C.cyan}[?]${C.bold} Digite seu número com código do país (só números): ${C.reset}`);
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n${C.green}╔═══════════════════════════════════════════════╗${C.reset}`);
                console.log(`${C.green}║  🔑 SEU CÓDIGO DE PAREAMENTO: ${C.bold}${C.white}${code}${C.reset}${C.green}         ║${C.reset}`);
                console.log(`${C.green}╚═══════════════════════════════════════════════╝${C.reset}\n`);
                console.log(`${C.yellow}[i] Vá em: WhatsApp > Dispositivos Conectados > Conectar com código de telefone.${C.reset}\n`);
                rl.close();
            } catch (err) {
                console.log(`${C.red}[-] Erro ao requisitar código: ${err.message}${C.reset}`);
                rl.close();
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;
            console.log(`${C.red}[!] Conexão perdida. Reconectando... (${shouldReconnect})${C.reset}`);
            if (shouldReconnect) setTimeout(() => connectToWhatsApp(), 3000);
        } else if (connection === 'open') {
            exibirBanner();
            console.log(`${C.green}${C.bold}[+] STATUS: ONLINE! Aguardando comandos...${C.reset}\n`);
            console.log(`${C.cyan}[i] Número do bot: ${C.bold}${sock.user.id}${C.reset}`);
            console.log(`${C.cyan}[i] Comandos: ${C.bold}.rvft${C.reset} (chat atual) | ${C.bold}.rvftpv${C.reset} (para o número configurado)`);
            console.log(`${C.cyan}[i] Destino do .rvftpv: ${C.bold}${NUMERO_DESTINO_PV}${C.reset}\n`);
            console.log(`${C.gray}────────────────────────────────────────────────────────────────────${C.reset}\n`);
        }
    });

    // ── Processamento de mensagens ────────────────────────────
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg || !msg.message) return;

        const sender = msg.key.remoteJid;
        const fromMe = msg.key.fromMe ? ' (enviada por mim)' : '';
        console.log(`${C.blue}[MSG]${C.reset} De: ${sender}${fromMe} | ID: ${msg.key.id}`);

        // Extrai o texto
        const text = msg.message.conversation ||
                     msg.message.extendedTextMessage?.text ||
                     msg.message.imageMessage?.caption ||
                     msg.message.videoMessage?.caption ||
                     '';

        console.log(`${C.blue}[TEXTO]${C.reset} "${text}"`);

        // ── Verifica se é .rvft ou .rvftpv ──────────────────
        const cmd = text.trim().toLowerCase();
        if (!cmd.startsWith('.rvft')) return;

        const isParaBot = cmd === '.rvftpv'; // se for .rvftpv, envia para o número configurado

        console.log(`${C.yellow}[CMD] ${cmd} recebido de ${sender}${C.reset}`);

        // ── Verifica se há mensagem citada ──────────────────
        const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            await sock.sendMessage(sender, {
                text: '❌ Responda a uma mensagem de *visualização única* com `.rvft` ou `.rvftpv`.',
                quoted: msg
            });
            return;
        }

        console.log(`${C.cyan}[~] Mensagem citada encontrada. Tentando extrair mídia...${C.reset}`);

        // ── Tenta extrair a mídia ──────────────────────────
        let realContent = extrairConteudoReal(quotedMsg);
        let isViewOnce = false;

        if (realContent) {
            isViewOnce = !!(realContent.imageMessage?.viewOnce || realContent.videoMessage?.viewOnce);
        }

        // ── Se não encontrou, carrega do servidor ──────────
        if (!realContent || !isViewOnce) {
            const quotedId = msg.message.extendedTextMessage.contextInfo.quotedMessageId;
            const quotedJid = msg.message.extendedTextMessage.contextInfo.quotedMessageRemoteJid || sender;
            if (quotedId) {
                console.log(`${C.cyan}[~] Carregando do servidor (ID: ${quotedId})...${C.reset}`);
                const loaded = await carregarMensagem(sock, quotedJid, quotedId);
                if (loaded) {
                    realContent = extrairConteudoReal(loaded);
                    if (realContent) {
                        isViewOnce = !!(realContent.imageMessage?.viewOnce || realContent.videoMessage?.viewOnce);
                    }
                }
            }
        }

        if (!realContent || !isViewOnce) {
            await sock.sendMessage(sender, {
                text: '❌ A mensagem citada não é uma *visualização única* ou não pôde ser carregada.',
                quoted: msg
            });
            console.log(`${C.red}[!] Não é view-once.${C.reset}`);
            return;
        }

        // ── Identifica o tipo de mídia ──────────────────────
        const isImage = !!realContent.imageMessage;
        const isVideo = !!realContent.videoMessage;
        const mediaType = isImage ? 'image' : isVideo ? 'video' : null;
        if (!mediaType) {
            await sock.sendMessage(sender, {
                text: '❌ Mídia não suportada (apenas imagem ou vídeo).',
                quoted: msg
            });
            return;
        }

        const mediaMessage = isImage ? realContent.imageMessage : realContent.videoMessage;

        try {
            // ── Baixa a mídia ───────────────────────────────
            console.log(`${C.cyan}[~] Baixando ${mediaType}...${C.reset}`);
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            console.log(`${C.green}[+] Download concluído (${buffer.length} bytes).${C.reset}`);

            // ── Define o destino ─────────────────────────────
            let targetJid;
            let destinoTexto;

            if (isParaBot) {
                // Usa o número configurado
                targetJid = NUMERO_DESTINO_PV + '@s.whatsapp.net';
                destinoTexto = `número configurado (${NUMERO_DESTINO_PV})`;
            } else {
                targetJid = sender; // envia no mesmo chat onde o comando foi enviado
                destinoTexto = 'chat atual';
            }

            console.log(`${C.cyan}[~] Enviando para ${targetJid} (${destinoTexto})...${C.reset}`);

            // ── Prepara a legenda ────────────────────────────
            const senderClean = sender.split('@')[0];
            const caption = `🔓 *Mídia Revelada*\n\n👤 *Enviado por:* @${senderClean}\n📝 *Legenda:* ${mediaMessage.caption || 'Nenhuma'}\n\n👑 _Bot por: Luís Lutchi_`;

            // ── Envia a mídia ────────────────────────────────
            if (isImage) {
                await sock.sendMessage(targetJid, {
                    image: buffer,
                    caption: caption,
                    mentions: [sender]
                });
            } else {
                await sock.sendMessage(targetJid, {
                    video: buffer,
                    caption: caption,
                    mentions: [sender]
                });
            }

            // ── Confirmação no chat onde foi solicitado ────
            await sock.sendMessage(sender, {
                text: `✅ Mídia revelada e enviada para o ${destinoTexto}!`,
                quoted: msg
            });

            console.log(`${C.green}${C.bold}[+] REVELADO COM SUCESSO para ${destinoTexto}!${C.reset}\n`);

        } catch (err) {
            console.log(`${C.red}[-] Erro ao revelar: ${err.message}${C.reset}`);
            await sock.sendMessage(sender, {
                text: `❌ Erro ao revelar: ${err.message}`,
                quoted: msg
            });
        }
    });

    return sock;
}

// ============================================================
//  🚀  INICIA O BOT
// ============================================================
connectToWhatsApp().catch(err => {
    console.error(`${C.red}${C.bold}[ERRO FATAL]${C.reset} ${err.message}`);
    process.exit(1);
});
