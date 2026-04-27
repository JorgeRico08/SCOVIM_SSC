import axios from 'axios';
import https from 'https';
import { env } from '../../config/env';
import { oostoTokenManager } from './oosto-token.manager';

const httpsAgent = new https.Agent({
    rejectUnauthorized: !env.oostoAllowSelfSigned
});

export const oostoClient = axios.create({
    baseURL: env.oostoApiUrl,
    httpsAgent,
    headers: {
        'Content-Type': 'application/json'
    }
});

oostoClient.interceptors.request.use(async (config) => {
    const token = await oostoTokenManager.getValidToken();

    config.headers.Authorization = `Bearer ${token}`;

    return config;
});