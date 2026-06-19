const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, jidNormalizedUser, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const readline = require('readline');

// Paleta de Cores ANSI para personalização da CLI
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    white: "\x1b[37m"
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

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
    console.log(`${C.bold}${C.cyan}║   ${C.green}▶ Core:${C.white} Baileys v7          ${C.green}▶ Escopo:${C.white} Private DM            ${C.cyan}║${C.reset}`);
    console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}\n`);
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    exibirBanner();
    console.log(`${C.cyan}[~]${C.reset} Inicializando canais de comunicação com o WhatsApp...`);
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome') 
    });

    if (!sock.authState.creds.registered) {
        console.log(`\n${C.yellow}[!] Credenciais não encontradas. Pareamento via terminal ativado.${C.reset}`);
        let phoneNumber = await question(`${C.cyan}[?]${C.bold} Digite seu número com o código do país (Apenas números): ${C.reset}`);
        
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n${C.green}╔═══════════════════════════════════════════════╗${C.reset}`);
                console.log(`${C.green}║  🔑 SEU CÓDIGO DE PAREAMENTO: ${C.bold}${C.white}${code}${C.reset}${C.green}         ║${C.reset}`);
                console.log(`${C.green}╚═══════════════════════════════════════════════╝${C.reset}\n`);
                console.log(`${C.yellow}[i] Vá em: Dispositivos Conectados > Conectar com código de telefone no celular.${C.reset}\n`);
            } catch (err) {
                console.log(`${C.red}[-] Erro ao requisitar código de pareamento interno.${C.reset}`);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            
            console.log(`${C.red}[!] Link de comunicação caiu. Nova tentativa em andamento (${shouldReconnect})...${C.reset}`);
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            exibirBanner();
            console.log(`${C.green}${C.bold}[+] STATUS: INTERCEPTADOR ONLINE E AGUARDANDO MÍDIAS PRIVADAS!${C.reset}\n`);
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const isGroup = msg.key.remoteJid.endsWith('@g.us');
        if (isGroup) return;

        const type = Object.keys(msg.message)[0];
        let isViewOnce = type === 'viewOnceMessage' || type === 'viewOnceMessageV2';
        
        if (isViewOnce) {
            const hora = new Date().toLocaleTimeString();
            console.log(`\n${C.yellow}[${hora}] ⚡ Alvo detectado! Nova mídia efêmera recebida...${C.reset}`);
            
            try {
                const viewOnceContent = msg.message[type].message;
                const mediaType = Object.keys(viewOnceContent)[0];
                const mediaMessage = viewOnceContent[mediaType];

                console.log(`${C.cyan}[~] Baixando pacote binário do servidor (${mediaType === 'imageMessage' ? 'Imagem' : 'Vídeo'})...${C.reset}`);
                const stream = await downloadContentFromMessage(mediaMessage, mediaType.replace('Message', ''));
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                const myJid = jidNormalizedUser(sock.user.id);
                const senderNumber = msg.key.participant || msg.key.remoteJid;
                const senderClean = senderNumber.split('@')[0];
                const caption = `🔓 *Mídia Revelada Privada*\n\n👤 *Enviado por:* @${senderClean}\n📝 *Legenda:* ${mediaMessage.caption || 'Nenhuma'}\n\n👑 _Bot por: Luís Lutchi_`;

                console.log(`${C.cyan}[~] Sincronizando e enviando para o seu cofre privado...${C.reset}`);

                if (mediaType === 'imageMessage') {
                    await sock.sendMessage(myJid, { image: buffer, caption: caption, mentions: [senderNumber] });
                } else if (mediaType === 'videoMessage') {
                    await sock.sendMessage(myJid, { video: buffer, caption: caption, mentions: [senderNumber] });
                }
                console.log(`${C.green}${C.bold}[+] CONCLUÍDO: Mídia salva e descriptografada com sucesso!${C.reset}\n`);
            } catch (err) {
                console.log(`${C.red}[-] Erro crítico ao decodificar buffer de mídia efêmera: ${err.message}${C.reset}\n`);
            }
        }
    });
}

connectToWhatsApp().catch(err => console.error('Erro de Processamento:', err));
