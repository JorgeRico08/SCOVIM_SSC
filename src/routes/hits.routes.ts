import { Router } from 'express';
// import { getHits } from '../controllers/hits.controller';
import { getImage, getToken } from '../controllers/oosto_auth.controller';

const router = Router();

// router.get('/', getHits);
// VER IMAGENES DE OOSTO FRONT
// routes
router.get('/image', getImage);
router.get('/datos-oosto', getToken);

export default router;