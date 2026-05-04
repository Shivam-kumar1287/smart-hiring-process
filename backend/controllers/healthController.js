import mongoose from 'mongoose';

export const healthCheck = async (req, res) => {
  try {
    // Check database connection state
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
};

