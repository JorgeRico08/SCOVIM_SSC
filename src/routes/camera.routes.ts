import { Router } from 'express';
import { desconectarCamara, obtenerCamaras, reconectarCamara } from '../controllers/camera.controller';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/obtener-camaras', obtenerCamaras);

router.get('/stream/:id/index.m3u8', (req, res) => {
    const { id } = req.params;
    const filePath = path.join(process.cwd(), 'public', 'streams', id, 'index.m3u8');

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Stream no disponible');
    }
});


router.post('/:id/desconectar', desconectarCamara);

router.post('/:id/reconectar', reconectarCamara);

export default router;