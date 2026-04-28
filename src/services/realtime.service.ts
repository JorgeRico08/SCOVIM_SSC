import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

class RealtimeService {
    private io: Server | null = null;

    init(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: '*'
            }
        });

        this.io.on('connection', socket => {
            console.log('Cliente conectado:', socket.id);
        });
    }

    emitirEstadoCamara(payload: any) {
        if (!this.io) return;

        this.io.emit('camera:status', payload);
    }
}

export const realtimeService = new RealtimeService();