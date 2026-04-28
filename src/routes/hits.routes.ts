import { Router } from 'express';
// import { getHits } from '../controllers/hits.controller';
import { getImage, getDataOosto } from '../controllers/oosto_auth.controller';

const router = Router();

// router.get('/', getHits);
// VER IMAGENES DE OOSTO FRONT
// routes
router.get('/image', getImage);
// Ver datos del detenido
router.get('/datos-oosto/:iidoosto', getDataOosto);

export default router;