// BACKEND DA API
// BIBLIOTECAS UTILIZADAS PARA COMPOSIÇÃO DA API
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const { body, validationResult } = require('express-validator');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const mysql = require('mysql2/promise');

// PORTA ONDE O SERVIÇO SERÁ INICIADO
const port = 3300;
const idClient = 'Impacto';

// NUMEROS AUTORIZADOS
const permissaoBot = ['556992102573@c.us','556993405268@c.us'];

const createConnection = async () => {
	return await mysql.createConnection({
		host: '147.79.86.208',
		user: 'inaciolocal',
		password: 'Inacio@2628',
		database: 'BancoBot'
	});
};

// SERVIÇO EXPRESS
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(fileUpload({
  debug: true}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

// PARÂMETROS DO CLIENT DO WPP
const client = new Client({
  authStrategy: new LocalAuth({ clientId: idClient }),
  puppeteer: { headless: true,
  //executablePath: '/usr/bin/google-chrome-stable',
  //executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  executablePath: '/usr/bin/chromium-browser',  
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

// INITIALIZE DO CLIENT DO WPP
client.initialize();

// EVENTOS DE CONEXÃO EXPORTADOS PARA O INDEX.HTML VIA SOCKET
io.on('connection', function(socket) {
  socket.emit('message', '© Impacto - Iniciado');
  socket.emit('qr', './whatsappDesconetado.png');

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', '© Impacto QRCode recebido, aponte a câmera do seu celular!');
    });
});

if (client.on('authenticated', (session) => {
    socket.emit('authenticated', '© Impacto Autenticado!');
    socket.emit('message', '© Impacto Autenticado!');
    console.log('© Impacto Autenticado');
}));

client.on('auth_failure', function() {
    socket.emit('message', '© Impacto Falha na autenticação, reiniciando...');
    console.error('© Impacto Falha na autenticação');
});

client.on('change_state', state => {
  console.log('© Impacto Status de conexão: ', state );
  socket.emit('message', '© Aquile Status de conexão: '+ state);
});

client.on('disconnected', (reason) => {
  socket.emit('message', '© Aquile Cliente desconectado!');
  console.log('© Aquile Cliente desconectado', reason);
  
});
 (client.on('ready', async () => {
  socket.emit('ready', '© Impacto Dispositivo pronto!');
  socket.emit('message', '© Impacto Dispositivo pronto!');
  socket.emit('qr', './whatsappConectado.png');
  console.log('© Impacto Dispositivo pronto');
  const groups = await client.getChats()
  for (const group of groups){
    if(group.id.server.includes('g.us')){
      socket.emit('relatorio', 'Nome: ' + group.name + ' - ID: ' + group.id._serialized.split('@')[0]);
    }
  }  
  }));
});

//EVENTO DE ESCUTA DE MENSAGENS RECEBIDAS PELA API

// COMANDO BOT

// ENVIAR MSG COM MENÇÃO AOS PARTICIPANTES
client.on('message_create', async msg => {
  if (msg.body === '!promocao' && msg.hasQuotedMsg) {
    const chat = await msg.getChat();
    const quotedMsg = await msg.getQuotedMessage();  
    try{
      let mentions = [];
      for(let participant of chat.participants) {
        if (!permissaoBot.includes(msg.author || msg.from)) 
            return console.log('Numero não permitido');
          const contact = await client.getContactById(participant.id._serialized);
          mentions.push(contact);
          
      }
      if (quotedMsg.hasMedia) {
        const attachmentData = await quotedMsg.downloadMedia();
        await chat.sendMessage(attachmentData, {mentions: mentions, caption: quotedMsg.body});
      } else {
        await chat.sendMessage(quotedMsg.body, { mentions: mentions });
      }
    } catch (e){
      console.log('© Impacto '+e)
    }
  }
  if (msg.body === '!id') {
    console.log(msg.author+' '+msg.from);
  }

}); 

// INITIALIZE DO SERVIÇO
server.listen(port, function() {
  console.log('© Impacto - Aplicativo rodando na porta *: ' + port);
});
