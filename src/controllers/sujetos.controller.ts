import { Request, Response } from 'express';
import { obtenerKardexPorSubjectId } from '../services/kardex.service';
import { ResponseDTO } from '../common/response';

export const getSujetoById = async (req: Request, res: Response) => {
    try {
        const { subjectId } = req.params;

        const sujeto = await obtenerKardexPorSubjectId(subjectId.toString());
        return res.status(200).json(ResponseDTO.ok({ sujeto }));
    } catch (error) {
        console.error('Error en getSujetoById:', error);

        return res.status(500).json({
            ok: false,
            message: 'Error al obtener sujeto'
        });
    }
};