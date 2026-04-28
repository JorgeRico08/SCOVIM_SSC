import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

class RealtimeService {
    private io: Server | null = null;

    public init(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: '*'
            }
        });

        this.io.on('connection', (socket) => {
            console.log('🟢 Conectado:', socket.id);

            socket.on('disconnect', () => {
                console.log('🔴 Desconectado:', socket.id);
            });
        });
    }

    public emitRecognition(data: unknown) {
        if (!this.io) return;

        this.io.emit('recognition:created', data);
    }

    public emitirEstadoCamara(payload: unknown) {
        if (!this.io) return;

        this.io.emit('camera:status', payload);
    }
}

export const realtimeService = new RealtimeService();