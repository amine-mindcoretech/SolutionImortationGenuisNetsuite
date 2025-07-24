const express = require('express');
const router = express.Router();
const itemCategoriesController = require('../controllers/itemCategoriesController');

router.post('/create', itemCategoriesController.createTable);
router.get('/sync', itemCategoriesController.syncData);
router.get('/download-csv', itemCategoriesController.downloadCSV);
router.delete('/drop', itemCategoriesController.dropTable);

module.exports = router;