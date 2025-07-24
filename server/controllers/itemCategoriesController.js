const itemCategoriesModel = require('../models/itemCategoriesModel');

const itemCategoriesController = {
  async createTable(req, res) {
    try {
      const result = await itemCategoriesModel.createTable();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async syncData(req, res) {
    try {
      const result = await itemCategoriesModel.syncData();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async downloadCSV(req, res) {
    try {
      const csv = await itemCategoriesModel.downloadCSV();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=itemcategoriesgenius.csv');
      res.send(csv);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: error.message });
      } else {
        console.error('Error after headers sent:', error.message);
      }
    }
  },

  async dropTable(req, res) {
    try {
      const result = await itemCategoriesModel.dropTable();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = itemCategoriesController;