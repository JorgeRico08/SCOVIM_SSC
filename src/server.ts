import app from './app';
import { env } from './config/env';
import { oostoTokenManager } from './services/oosto_init/oosto-token.manager';
import { oostoSocketService } from './services/oosto_init/oosto-socket.service';
import http from 'http';
import { realtimeService } from './services/realtime.service';
import { iniciarStreamsCamaras } from './controllers/camera.controller';
import { testConnections } from './db/context';

const startServer = async () => {
    try {
        await oostoTokenManager.initialize();
        await oostoSocketService.connect();
        const server = http.createServer(app);
        iniciarStreamsCamaras();

        realtimeService.init(server);

        server.listen(env.port, async () => {
            try {
                await testConnections();
                console.log(`Servidor SCOVIM corriendo en http://localhost:${env.port} (DB OK)`);
            } catch {
                console.warn('⚠️ El servidor inició pero la DB NO respondió aún');
            }
        });

    } catch (error) {
        console.error('No se pudo iniciar la aplicación:', error);
        process.exit(1);
    }
};

startServer();