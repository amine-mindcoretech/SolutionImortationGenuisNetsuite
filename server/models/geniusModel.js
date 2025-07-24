//geniusModel.js
const connectToGenius = require('../config/odbcConfig');

const getClients = async () => {
  const connection = await connectToGenius();
  try {
    const result = await connection.query(
      "SELECT * FROM Cli WHERE actif = 'O' AND Fac_A = C_No AND IsNationalAccount = 0"
    );
    return result;
  } finally {
    await connection.close();
  }
};

const getContacts = async () => {
  const connection = await connectToGenius();
  try {
    const result = await connection.query(
      "SELECT * FROM Cli WHERE actif = 'O' AND Fac_A <> C_No AND IsNationalAccount = 0"
    );
    return result;
  } finally {
    await connection.close();
  }
};

module.exports = { getClients, getContacts };
