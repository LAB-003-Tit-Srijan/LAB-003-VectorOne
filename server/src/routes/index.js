import healthRoutes from './health.routes.js';
import apiRoutes from './api.routes.js';
import authRoutes from './auth.routes.js';

export function registerRoutes(app) {
  app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to the VectorOne API',
      status: 'active',
      endpoints: ['/health', '/api', '/api/auth', '/api/ai/summarize']
    });
  });
  app.use(healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api', apiRoutes);
}
