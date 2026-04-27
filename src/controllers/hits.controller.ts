import { Request, Response } from 'express';
import { ResponseDTO } from '../common/response';

export const getHits = async (req: Request, res: Response) => {
    try {

        return res.status(200).json(ResponseDTO.ok({ total: 0, data: [] }));
    } catch (error) {
        console.error('Error en getHits:', error);

        return res
            .status(500)
            .json(ResponseDTO.error('Error al obtener hits'));
    }
};