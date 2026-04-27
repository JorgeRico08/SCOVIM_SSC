import axios from 'axios';
import https from 'https';
import { jwtDecode } from 'jwt-decode';
import { env } from '../../config/env';

// Define la estructura esperada del payload del JWT
type JwtPayload = {
    exp?: number; // segundos UNIX
    iat?: number;
};

// Clase Singleton para gestionar el ciclo de vida del token de autenticación de Oosto
// Incluye: solicitud, renovación automática, caché y validación de expiración.
class OostoTokenManager {

    // Instancia única de la clase, usada para aplicar el patrón Singleton
    private static instance: OostoTokenManager;

    private token: string | null = null;
    private expiresAt: Date | null = null;
    private isRefreshing = false;

    // Agente HTTPS personalizado.
    // Si oostoAllowSelfSigned es true, permite certificados autofirmados.
    private httpsAgent = new https.Agent({
        rejectUnauthorized: !env.oostoAllowSelfSigned
    });

    // Constructor privado para evitar crear instancias con new.
    // Esto obliga a usar getInstance().
    private constructor() { }

    // Devuelve la instancia única de OostoTokenManager
    public static getInstance(): OostoTokenManager {

        // Si todavía no existe una instancia, la crea
        if (!OostoTokenManager.instance) {
            OostoTokenManager.instance = new OostoTokenManager();
        }

        // Regresa siempre la misma instancia
        return OostoTokenManager.instance;
    }

    // Inicializa el manager obteniendo un token desde Oosto
    public async initialize(): Promise<void> {
        await this.refreshToken();
    }

    // Devuelve un token válido.
    // Si el token actual existe y no está por expirar, lo reutiliza.
    // Si no, solicita uno nuevo.
    public async getValidToken(): Promise<string> {
        if (this.token && this.isTokenValid()) {
            return this.token;
        }

        await this.refreshToken();

        if (!this.token) {
            throw new Error('No se pudo obtener token válido de Oosto');
        }

        return this.token;
    }

    // Verifica si el token actual sigue siendo válido
    private isTokenValid(): boolean {
        if (!this.token || !this.expiresAt) {
            return false;
        }

        const now = new Date();

        // Margen preventivo:
        // si faltan menos de 60 segundos para que expire,
        // se considera inválido para forzar renovación.
        const safetyLimit = new Date(this.expiresAt.getTime() - 60_000);

        return now < safetyLimit;
    }

    // Solicita un nuevo token al endpoint /login de Oosto
    private async refreshToken(): Promise<void> {
        if (this.isRefreshing) {
            await this.waitUntilRefreshEnds();
            return;
        }

        this.isRefreshing = true;

        try {
            const response = await axios.post(
                `${env.oostoApiUrl}/login`,
                {
                    username: env.oostoUsername,
                    password: env.oostoPassword
                },
                {
                    httpsAgent: this.httpsAgent,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const token = response.data?.token;

            if (!token) {
                throw new Error('Oosto no regresó token');
            }

            const decoded = jwtDecode<JwtPayload>(token);

            if (!decoded.exp) {
                throw new Error('El token de Oosto no contiene fecha de expiración exp');
            }

            this.token = token;
            this.expiresAt = new Date(decoded.exp * 1000);

        } finally {
            this.isRefreshing = false;
        }
    }

    // Espera mientras otro proceso termina de renovar el token
    private async waitUntilRefreshEnds(): Promise<void> {
        while (this.isRefreshing) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
}

export const oostoTokenManager = OostoTokenManager.getInstance();