import { oostoClient } from './oosto_init/oosto-client.service';

export const obtenerHitsOosto = async (sfolioOosto: string) => {
    const response = await oostoClient.get(`/subjects/${sfolioOosto}`);
    return response.data;
};


