import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
    res.render('dashboard', {
        title: 'Inicio del centro de video vigilancia SMA',
    });
});

router.get('/streaming', (req, res) => {
    res.render('streaming', {
        title: 'Streaming de Cámara'
    });
});

router.get('/kardex/:iidoosto', (req, res) => {
    const { iidoosto } = req.params;
    res.render('kardex', {
        title: 'Kardex del Sujeto',
        iidOosto: iidoosto
    });
});



export default router;