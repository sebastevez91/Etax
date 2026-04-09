process.env.PGPASSWORD = 'abc123';

const { Client } = require('pg');

const config = {
  host: '127.0.0.1',
  port: 5432,
  database: 'etax_db',
  user: 'etax_user',
  password: String('abc123'),
};

console.log('Config:', config);
console.log('Password type:', typeof config.password);

const client = new Client(config);

client.connect()
  .then(() => {
    console.log('Conexion exitosa');
    return client.end();
  })
  .catch((err) => {
    console.error('Error:', err.message);
  });
