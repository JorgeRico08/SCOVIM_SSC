import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Pool, type PoolConfig } from 'pg';
import { parse } from 'pg-connection-string';

dotenv.config({
    path: path.resolve(process.cwd(), 'src', '.env'),
});

console.log('ENV PATH:', path.resolve(process.cwd(), '.env'));
console.log('DBGD_HOST:', process.env.DBGD_HOST);
1
// ── Types ─────────────────────────────────────────────────────────────
type RequiredDbConfig = Pick<PoolConfig, 'host' | 'port' | 'database' | 'user'>;

// ── Util ──────────────────────────────────────────────────────────────
function requiredConfigOrThrow(prefix: string, cfg: PoolConfig): void {
    const missing: string[] = [];

    for (const k of ['host', 'port', 'database', 'user'] as const) {
        const value = cfg[k as keyof RequiredDbConfig];

        if (
            value === undefined ||
            value === null ||
            value === '' ||
            Number.isNaN(value)
        ) {
            missing.push(k);
        }
    }

    if (missing.length) {
        const env = process.env;
        const P = prefix.toUpperCase();

        const dbg = {
            [`${P}_URL`]: env[`${P}_URL`],
            [`${P}_HOST`]: env[`${P}_HOST`],
            [`${P}_PORT`]: env[`${P}_PORT`],
            [`${P}_DATABASE`]: env[`${P}_DATABASE`],
            [`${P}_USER`]: env[`${P}_USER`],
        };

        throw new Error(
            `Config incompleta para prefijo "${P}". Faltan: ${missing.join(', ')}.\n` +
            `Revisa tu .env.\nDEBUG => ${JSON.stringify(dbg, null, 2)}`
        );
    }
}

// ── Creador de pools por prefijo ─────────────────────────────────────
export function createPool(prefix: string): Pool {
    const env = process.env;
    const P = String(prefix || '').trim().toUpperCase();

    const url = env[`${P}_URL`];

    let config: PoolConfig;

    if (url) {
        config = parse(url) as PoolConfig;
    } else {
        config = {
            host: env[`${P}_HOST`],
            port: Number(env[`${P}_PORT`]),
            database: env[`${P}_DATABASE`],
            user: env[`${P}_USER`],
            password: env[`${P}_PASSWORD`],
        };
    }

    requiredConfigOrThrow(P, config);

    let ssl: PoolConfig['ssl'] = {
        rejectUnauthorized: false,
    };

    if (env.PGSSL === 'true') {
        const caPath = env.PGSSL_CA_PATH
            ? path.isAbsolute(env.PGSSL_CA_PATH)
                ? env.PGSSL_CA_PATH
                : path.resolve(__dirname, env.PGSSL_CA_PATH)
            : undefined;

        ssl = {
            rejectUnauthorized: true,
            ca: caPath ? fs.readFileSync(caPath, 'utf8') : undefined,
            cert: env.PGSSL_CERT_PATH
                ? fs.readFileSync(env.PGSSL_CERT_PATH, 'utf8')
                : undefined,
            key: env.PGSSL_KEY_PATH
                ? fs.readFileSync(env.PGSSL_KEY_PATH, 'utf8')
                : undefined,
        };
    }

    return new Pool({
        ...config,
        ssl,
        min: Number(env.PG_POOL_MIN) || 0,
        max: Number(env.PG_POOL_MAX) || 10,
        idleTimeoutMillis: Number(env.PG_IDLE_MS) || 10000,
        allowExitOnIdle: false,
    });
}

// Pools listos con tus prefijos del .env
export const poolGD = createPool('DBGD');
export const poolRH = createPool('DBRH');

// Test opcional
export async function testConnections(): Promise<void> {
    const [a, b] = await Promise.all([
        poolGD.query<{ db: string }>('SELECT current_database() AS db'),
        poolRH.query<{ db: string }>('SELECT current_database() AS db'),
    ]);

    console.log(`✅ Conectado a: ${a.rows[0].db} y ${b.rows[0].db}`);
}

// 🔹 Cierre ordenado
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, async () => {
        try {
            await Promise.all([poolGD.end(), poolRH.end()]);
            console.log('Pools cerrados correctamente');
        } finally {
            process.exit(0);
        }
    });
}