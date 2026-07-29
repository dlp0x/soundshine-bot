// ========================================
// routes/health.js
// ========================================

import { Router } from 'express';

export default (gateway, logger) => {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        bot: (await gateway.getBotTag()) || 'Unknown',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      res.json(healthData);
    } catch (error) {
      logger.error('Erreur route health:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  });

  return router;
};
