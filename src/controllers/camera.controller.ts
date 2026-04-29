import { Request, Response } from 'express';
import { ResponseDTO } from '../common/response';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { realtimeService } from '../services/realtime.service';

const procesosFFmpeg = new Map<string, ChildProcessWithoutNullStreams>();
const watchersCamara = new Map<string, NodeJS.Timeout>();
const ultimoSegmentoCamara = new Map<string, number>();

const camaras = [
    {
        id: 'camara-01',
        nombre: 'Cámara 01',
        rtsp: 'rtsp://admin:C4ms3p2023*@192.168.105.11:554/media/video1',
        estado: 1
    },
    {
        id: 'camara-02',
        nombre: 'Cámara 02',
        rtsp: 'rtsp://admin:admin1234_@172.30.30.4:554/unicast/c2/s2/live',
        estado: 0
    },
    /*{
        id: 'camara-03',
        nombre: 'Cámara 03',
        rtsp: 'rtsp://usuario:password@192.168.1.103:554/stream'
    },
    {
        id: 'camara-04',
        nombre: 'Cámara 04',
        rtsp: 'rtsp://usuario:password@192.168.1.104:554/stream'
    }*/
];

//const streamsIniciados = new Set<string>();

export const obtenerCamaras = async (req: Request, res: Response) => {
    try {
        const data = camaras.map(camara => ({
            id: camara.id,
            nombre: camara.nombre,
            estado: camara.estado,
            hlsUrl: `/public/streams/${camara.id}/index.m3u8`
        }));

        return res.status(200).json(
            ResponseDTO.ok({ total: data.length, data })
        );

    } catch (error) {
        console.error('Error al obtener cámaras:', error);
        return res.status(500).json(
            ResponseDTO.error('Error al obtener cámaras')
        );
    }
};

export function iniciarStreamsCamaras() {
    camaras.forEach(iniciarStream);
}

function iniciarStream(camara: any) {
    if (procesosFFmpeg.has(camara.id)) {
        console.log(`[${camara.id}] Ya está iniciado`);
        return;
    }

    const outputDir = path.join(process.cwd(), 'public', 'streams', camara.id);
    fs.mkdirSync(outputDir, { recursive: true });

    //limpiarCarpetaStream(outputDir);
    const outputFile = path.join(outputDir, 'index.m3u8');

    const ffmpeg = spawn(process.env.FFMPEG_PATH || 'ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-i', camara.rtsp,
        '-an',
        '-c:v', 'copy',
        '-f', 'hls',
        '-hls_time', '1',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments+omit_endlist',
        '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
        outputFile
    ]);

    procesosFFmpeg.set(camara.id, ffmpeg);
    actualizarEstadoCamara(camara.id, 1, 'Stream iniciado');
    iniciarMonitorSegmentos(camara.id, outputDir);

    ffmpeg.stderr.on('data', data => {
        console.log(`[${camara.id}] ${data}`);
    });

    ffmpeg.on('close', code => {
        console.log(`[${camara.id}] FFmpeg cerrado: ${code}`);

        const existe = procesosFFmpeg.has(camara.id);
        procesosFFmpeg.delete(camara.id);
        if (existe) {
            actualizarEstadoCamara(camara.id, 0, 'FFmpeg cerrado');
        }
    });

    ffmpeg.on('error', error => {
        console.error(`[${camara.id}] Error FFmpeg:`, error);
        const existe = procesosFFmpeg.has(camara.id);
        procesosFFmpeg.delete(camara.id);
        if (existe) {
            actualizarEstadoCamara(camara.id, 0, 'Error FFmpeg');
        }
    });
}

export const desconectarCamara = async (req: Request, res: Response) => {
    const { id } = req.params;
    let sId: string = id as string
    const ok = desconectarStreamCamara(sId);

    return res.json(
        ResponseDTO.ok({
            id,
            desconectada: ok,
            mensaje: ok ? 'Cámara desconectada' : 'La cámara no estaba activa'
        })
    );
};

export const reconectarCamara = async (req: Request, res: Response) => {
    const { id } = req.params;

    let sId: string = id as string
    const ok = reconectarStreamCamara(sId);

    if (!ok) {
        return res.status(404).json(
            ResponseDTO.error('Cámara no encontrada')
        );
    }

    return res.json(
        ResponseDTO.ok({
            id,
            mensaje: 'Cámara reconectando'
        })
    );
};

export function desconectarStreamCamara(id: string) {
    const proceso = procesosFFmpeg.get(id);

    detenerMonitorSegmentos(id);

    if (!proceso) {
        actualizarEstadoCamara(id, 0, 'Cámara no activa');
        return false;
    }
    proceso.once('close', () => {
        limpiarCarpetaStream(path.join(process.cwd(), 'public', 'streams', id));
        actualizarEstadoCamara(id, 0, 'Desconectada manualmente');
    });

    proceso.kill('SIGTERM');
    procesosFFmpeg.delete(id);
    return true;
}

export function reconectarStreamCamara(id: string) {
    const camara = camaras.find(x => x.id === id);

    if (!camara) {
        return false;
    }

    desconectarStreamCamara(id);

    setTimeout(() => {
        iniciarStream(camara);
    }, 1000);

    return true;
}

function actualizarEstadoCamara(id: string, estado: 0 | 1, motivo = '') {
    const camara = camaras.find(x => x.id === id);

    if (!camara) return;

    camara.estado = estado;
    realtimeService.emitirEstadoCamara({
        id: camara.id,
        nombre: camara.nombre,
        estado: camara.estado,
        motivo,
        fecha: new Date().toISOString()
    });
    console.log(`[${id}] Estado actualizado: ${estado} ${motivo}`);
}

function iniciarMonitorSegmentos(camaraId: string, outputDir: string) {
    detenerMonitorSegmentos(camaraId);

    ultimoSegmentoCamara.set(camaraId, Date.now());

    const intervalo = setInterval(() => {
        if (!fs.existsSync(outputDir)) return;

        const archivos = fs.readdirSync(outputDir)
            .filter(x => x.endsWith('.ts') || x.endsWith('.m3u8'))
            .map(x => {
                const fullPath = path.join(outputDir, x);
                const stat = fs.statSync(fullPath);

                return {
                    archivo: x,
                    modificado: stat.mtimeMs
                };
            });

        if (archivos.length === 0) return;

        const ultimoModificado = Math.max(...archivos.map(x => x.modificado));
        const ahora = Date.now();

        if (ultimoModificado > (ultimoSegmentoCamara.get(camaraId) || 0)) {
            ultimoSegmentoCamara.set(camaraId, ultimoModificado);
            return;
        }

        const segundosSinActualizar = (ahora - ultimoModificado) / 1000;

        if (segundosSinActualizar >= 6) {
            actualizarEstadoCamara(camaraId, 0, 'Sin segmentos nuevos');
            detenerMonitorSegmentos(camaraId);
        }

    }, 2000);

    watchersCamara.set(camaraId, intervalo);
}

function detenerMonitorSegmentos(camaraId: string) {
    const watcher = watchersCamara.get(camaraId);

    if (watcher) {
        clearInterval(watcher);
        watchersCamara.delete(camaraId);
    }

    ultimoSegmentoCamara.delete(camaraId);
}


function limpiarCarpetaStream(outputDir: string) {
    if (!fs.existsSync(outputDir)) return;

    for (const file of fs.readdirSync(outputDir)) {
        if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
            fs.unlinkSync(path.join(outputDir, file));
        }
    }
}
/*
function iniciarStreamOld(camara: any) {
    if (streamsIniciados.has(camara.id)) return;

    streamsIniciados.add(camara.id);

    const outputDir = path.join(process.cwd(), 'public', 'streams', camara.id);

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, 'index.m3u8');
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

    const ffmpeg = spawn(ffmpegPath, [
        '-rtsp_transport', 'tcp',
        '-i', camara.rtsp,

        '-an',
        '-c:v', 'copy',

        '-f', 'hls',
        '-hls_time', '1',
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments+append_list+omit_endlist',
        '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),

        outputFile
    ]);

    ffmpeg.stderr.on('data', data => {
        console.log(`[${camara.id}] ${data}`);
    });

    ffmpeg.on('close', code => {
        console.log(`[${camara.id}] FFmpeg cerrado: ${code}`);
        streamsIniciados.delete(camara.id);
        setTimeout(() => iniciarStream(camara), 5000);
    });

    ffmpeg.on('error', error => {
        console.error(`[${camara.id}] Error FFmpeg:`, error);
        streamsIniciados.delete(camara.id);
    });
}*/