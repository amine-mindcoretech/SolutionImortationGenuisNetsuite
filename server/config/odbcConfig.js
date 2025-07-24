// odbcconfig.js
// const odbc = require('odbc');

// const connectionString = `DSN=GENIUS_READ;UID=genius_read;PWD=egeniusRD*;MARS_Connection=Yes;`;

// const connectODBC = async () => {
//     return await odbc.connect(connectionString);
// };

// module.exports = { connectODBC };
const odbc = require('odbc');
async function connectODBC() {
  const connection = await odbc.connect('DSN=GENIUS_READ;UID=genius_read;PWD=egeniusRD*;CHARSET=latin1;MARS_Connection=Yes;');
  return connection;
}
module.exports = { connectODBC };