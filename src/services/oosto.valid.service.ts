import { oostoClient } from './oosto_init/oosto-client.service';

export const obtenerHitsOosto = async () => {
    var sfolioOosto = '4568249a-1c41-4791-b47f-68858ea9cc14';
    const response = await oostoClient.get(`/subjects/${sfolioOosto}`);
    return response.data;
};


