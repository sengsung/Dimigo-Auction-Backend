const socketIO = require('socket.io');

const io = socketIO();

io.listenIO = (httpServer) => {
  io.listen(httpServer);
}

module.exports = io;

io.on('connection', socket => {
  socket.on('error', err => console.error(err));

  socket.on('joinA', auctionId => {
    socket.join(`a${auctionId}`);
  });

  socket.on('leaveA', auctionId => {
    socket.leave(`a${auctionId}`);
  });
});
