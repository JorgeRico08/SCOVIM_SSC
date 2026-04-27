import { io, Socket } from 'socket.io-client';
import https from 'https';
import { oostoTokenManager } from './oosto-token.manager';
import { env } from '../../config/env';

class OostoSocketService {
    private socket: Socket | null = null;

    public async connect() {
        const token = await oostoTokenManager.getValidToken();

        console.log('🔌 Conectando a Oosto Socket...');

        this.socket = io(env.oostoApiUrl, {
            path: '/socket.io/',
            query: {
                token
            },
            transports: ['websocket'],
            rejectUnauthorized: !env.oostoAllowSelfSigned,
            reconnection: true
        });

        this.registerEvents();
    }

    private registerEvents() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('✅ Socket conectado a Oosto');
            console.log('Socket ID:', this.socket?.id);
        });

        this.socket.on('recognition:created', (data) => {
            console.log('🎯 HIT DETECTADO');
            console.log(JSON.stringify(data, null, 2));
        });

        this.socket.on('disconnect', (reason) => {
            console.log('⚠️ Socket desconectado:', reason);
        });

        this.socket.on('connect_error', (err: any) => {
            console.error('❌ Error socket:', err.message);

            if (err.description) {
                console.error('Descripción:', err.description);
            }

            if (err.context) {
                console.error('Contexto:', err.context);
            }
        });
    }
}

export const oostoSocketService = new OostoSocketService();