import axios from 'axios';
import { env } from '../../config/env';
import https from 'https';

export const getTokenOosto = async () => {
    try {

        const response = await axios.post(
            `${env.oostoApiUrl}/login`,
            {
                username: env.oostoUsername,
                password: env.oostoPassword
            },
            {
                httpsAgent: httpsAgent,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.token;

    } catch (error) {
        console.error('Error OOSTO TOKEN:', error);
        throw new Error('Error obteniendo token');
    }
};

const httpsAgent = new https.Agent({
    rejectUnauthorized: env.oostoAllowSelfSigned === 'true'
});