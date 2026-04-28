import { io, Socket } from 'socket.io-client';
import { oostoTokenManager } from './oosto-token.manager';
import { env } from '../../config/env';
import { realtimeService } from '../realtime.service';
import { mapOostoHitToView } from '../../common/mappers/oosto-hit.mapper';

class OostoSocketService {
    private socket: Socket | null = null;

    public async connect() {
        const token = await oostoTokenManager.getValidToken();
        const path = '/bt/api/socket.io';

        console.log('🔌 Conectando Socket Oosto...');

        this.socket = io(env.oostoUrlImagen, {
            path: path,
            query: {
                token
            },
            transports: ['websocket'],
            rejectUnauthorized: !env.oostoAllowSelfSigned,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 3000
        });

        this.registerEvents();
    }

    private registerEvents() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('✅ Connect to socket');
            console.log('Socket ID:', this.socket?.id);
        });

        this.socket.on('recognition:created', (data) => {
            console.log('🎯 Recognition created');
            const hits = Array.isArray(data) ? data : [data];

            hits.forEach(hit => {
                const hitMapped = mapOostoHitToView(hit);

                realtimeService.emitRecognition(hitMapped);
            });
        });

        this.socket.on('connect_error', (error: any) => {
            console.error('❌ Error socket:', error.message);
            console.error('Descripción:', error.description);
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('⚠️ Socket desconectado:', reason);
        });
    }
}

export const oostoSocketService = new OostoSocketService();