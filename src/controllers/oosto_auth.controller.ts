import { Request, Response } from 'express';
import { obtenerHitsOosto } from '../services/oosto.valid.service';
import { ResponseDTO } from '../common/response';
import { oostoTokenManager } from '../services/oosto_init/oosto-token.manager';
import axios from 'axios';
import https from 'https';
import { env } from '../config/env';

export const getToken = async (req: Request, res: Response) => {
    try {
        const helpInit = await obtenerHitsOosto();

        return res
            .status(200)
            .json(ResponseDTO.ok(helpInit, 'Consulta realizada correctamente'));

    } catch (error) {
        console.error('Error al consultar Oosto:', error);

        return res
            .status(500)
    }
};

export const getImage = async (req: Request, res: Response) => {
    try {
        const { url } = req.query;

        const token = await oostoTokenManager.getValidToken();

        const urlImagenes = env.oostoUrlImagen;
        const urlOostoImg = `${urlImagenes}${url}`;

        const response = await axios.get(urlOostoImg, {
            responseType: 'arraybuffer',
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        res.set('Content-Type', 'image/jpeg');
        res.send(response.data);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar imagen');
    }
};
