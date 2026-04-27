import { Request, Response } from 'express';
import { obtenerKardexPorSubjectId } from '../services/kardex.service';

export const getSujetoById = async (req: Request, res: Response) => {
    try {
        const { subjectId } = req.params;

        const sujeto = await obtenerKardexPorSubjectId(subjectId.toString());

        return res.json({
            ok: true,
            data: sujeto
        });
    } catch (error) {
        console.error('Error en getSujetoById:', error);

        return res.status(500).json({
            ok: false,
            message: 'Error al obtener sujeto'
        });
    }
};