import { Request, Response } from 'express';
import { obtenerHitsOosto } from '../services/oosto.valid.service';
import { ResponseDTO } from '../common/response';
import { oostoTokenManager } from '../services/oosto_init/oosto-token.manager';
import axios from 'axios';
import https from 'https';
import { env } from '../config/env';
import { getKardexDelictivo } from '../repositories/detenido.repository';
import { mapKardexOosto } from '../models/Oosto.kardex.model';
import { KardexDetenidoDTO } from '../models/Kardex.model';

export const getDataOosto = async (req: Request, res: Response) => {
    try {

        const { iidoosto } = req.params;
        var sfolioOosto = iidoosto.toString();

        const kardexOostoRaw = await obtenerHitsOosto(sfolioOosto);
        const kardexOosto = mapKardexOosto(kardexOostoRaw);

        const aRegistro = await getKardexDelictivo(sfolioOosto);
        if (!aRegistro || aRegistro.length === 0) {
            return res.status(404).json(
                ResponseDTO.error('No se encontraron datos para esta detención')
            );
        }

        const aDatos = new KardexDetenidoDTO(aRegistro, kardexOosto);

        return res
            .status(200)
            .json(ResponseDTO.ok(aDatos, 'Consulta realizada correctamente'));

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
