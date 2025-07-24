// controllers/clientController.js
const clientModel = require('../models/clientModel');

const clientController = {
  async createTable(req, res) {
    try {
      const result = await clientModel.createTable();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async syncData(req, res) {
    try {
      const result = await clientModel.syncData();
      res.status(200).json({
        success: result.success,
        message: result.message,
        data: result.data // Send the transformed data to the frontend
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async downloadCSV(req, res) {
    try {
      const csv = await clientModel.downloadCSV();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=clientgenius.csv');
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
      const result = await clientModel.dropTable();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = clientController;