// mysqlRoutes.js
const express = require('express');
const { saveDataToMySQL } = require('../controllers/mysqlController');

const router = express.Router();

router.post('/save-data', saveDataToMySQL); // Changé à /save-data pour plus de clarté

module.exports = router;