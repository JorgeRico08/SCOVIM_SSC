import dotenv from 'dotenv';

dotenv.config();

export const env = {
    port: Number(process.env.PORT) || 3000,

    oostoApiUrl: process.env.OOSTO_API_URL || '',
    oostoUrlImagen: process.env.OOSTO_API_URL_IMG || '',
    oostoUsername: process.env.OOSTO_USERNAME || '',
    oostoPassword: process.env.OOSTO_PASSWORD || '',
    oostoAllowSelfSigned: process.env.OOSTO_ALLOW_SELF_SIGNED || 'true',
};