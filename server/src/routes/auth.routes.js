import { Router } from 'express';
import {
  postRegister,
  postLogin,
  postGoogle,
  postRefresh,
  getMe,
  postLogout,
} from '../controllers/auth.controller.js';
import { authenticate, requireMongo } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', requireMongo, postRegister);
router.post('/login', requireMongo, postLogin);
router.post('/google', requireMongo, postGoogle);
router.post('/refresh', requireMongo, postRefresh);

router.get('/me', requireMongo, authenticate, getMe);
router.post('/logout', requireMongo, authenticate, postLogout);

export default router;
