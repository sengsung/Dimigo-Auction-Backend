module.exports = {
  DimiAuth: '키',
  jwt: {
    key: 'key',
    options: {
      issuer: 'DimigoAuction',
      expiresIn: '1h',
      algorithm: 'HS512',
    },
  },
  db: {
    mongo: {
      host: '127.0.0.1',
      port: 27017,
      database: 'dimiauction',
      user: '유저',
      password: '패스워드',
    },
  },
  server: {
    host: '127.0.0.1',
    port: 80,
    allowOrigins: [
      'http://localhost',
      'http://127.0.0.1'
    ],
  },
};
