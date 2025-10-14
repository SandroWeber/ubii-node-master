const { JIFFServer } = require('jiff-mpc');
const http = require('http').createServer();

const options = {
  crypto_provider: true,
  logs: true  
};

const jiffServer = new JIFFServer(http, options);

http.listen(8080, () => {
  console.log('JIFF server listening on http://localhost:8080 with crypto_provider');
});


jiffServer.hooks.log = (server, label, computation_id, msg) => {
  console.log(`[JIFF-LOG] ${label} comp=${computation_id}`, msg || "");
};

jiffServer.io.on('connection', (socket) => {
  console.log('[JIFF] client connected:', socket.id);

  socket.on('share', (msg) => {
    console.log('[JIFF] got share', JSON.stringify(msg).slice(0, 100));
  });

  socket.on('custom', (msg) => {
    console.log('[JIFF] got custom', JSON.stringify(msg).slice(0, 100));
  });
});
