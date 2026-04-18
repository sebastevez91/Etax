const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes'); 
const tripRoutes = require('./routes/tripRoutes');
const { registerTripSockets } = require('./sockets/tripSocket');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ app: 'ETax', status: 'running', version: '0.1.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes(io)); 

const PORT = process.env.PORT || 3000;

registerTripSockets(io);
// Conectar DB y luego levantar servidor
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Base de datos conectada y sincronizada');
    server.listen(PORT, () => {
      console.log(`ETax backend corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error conectando a la base de datos:', err.message);
  });