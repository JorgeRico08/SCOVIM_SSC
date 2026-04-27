import { Router } from 'express';
import { getSujetoById } from '../controllers/sujetos.controller';

const router = Router();

router.get('/:subjectId', getSujetoById);

export default router;