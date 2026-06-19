📸 WhatsApp ViewOnce Bot

"Node.js" (https://img.shields.io/badge/Node.js-18.x-green?style=flat&logo=node.js)
"Baileys" (https://img.shields.io/badge/Baileys-v7-blue?style=flat&logo=whatsapp)
"License" (https://img.shields.io/badge/License-MIT-yellow.svg)

Bot para WhatsApp que permite revelar mídias enviadas como Visualização Única (View Once) através de comandos simples.

---

✨ Funcionalidades

- 🔓 Revela imagens de visualização única
- 🎥 Revela vídeos de visualização única
- 📱 Comando ".rvft" para enviar a mídia revelada no mesmo chat
- 📤 Comando ".rvftpv" para enviar a mídia revelada para um número configurado
- 🔄 Reconexão automática
- 🖥️ Interface personalizada no terminal
- 🔑 Pareamento por código (sem QR Code)

---

📦 Instalação

Clone o repositório

git clone https://github.com/luislutchii/wa-viewonce-bot.git
cd wa-viewonce-bot

Instale as dependências

npm install

Ou:

npm install @whiskeysockets/baileys@latest pino @hapi/boom qrcode-terminal

---

⚙️ Configuração

Edite o arquivo "index.js":

const NUMERO_DESTINO_PV = '244924319522';

Substitua pelo número que receberá as mídias reveladas.

---

🚀 Executando

node index.js

Na primeira execução:

1. Digite seu número com DDI.
2. Copie o código de pareamento.
3. Abra o WhatsApp.
4. Vá em Dispositivos Conectados.
5. Escolha Conectar com código.
6. Digite o código exibido.

---

📖 Comandos

Comando| Função
".rvft"| Revela e envia a mídia no mesmo chat
".rvftpv"| Revela e envia para o número configurado

---

📂 Estrutura

wa-viewonce-bot/
├── auth_info_baileys/
├── node_modules/
├── index.js
├── package.json
├── package-lock.json
└── README.md

---

🛠️ Tecnologias

- Node.js
- Baileys
- Pino
- Boom
- WhatsApp Multi Device

---

👑 Desenvolvedor

Luís Lutchi

- GitHub: https://github.com/luislutchii
- Instagram: @luislutchii

---

📜 Licença

MIT License © Luís Lutchi

---

⚠️ Aviso

Este projeto é destinado exclusivamente para fins educacionais e de pesquisa.

Utilize com responsabilidade e respeite a privacidade de terceiros.

---

<p align="center">
Feito com ❤️ por <strong>Luís Lutchi</strong>
</p>
