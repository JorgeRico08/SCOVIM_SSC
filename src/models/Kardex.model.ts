type DetencionDb = {
    dtfecha: string | null;
    iiddetenido: number;
    stipoingreso: string | null;
    slugardetencion: string | null;
    sagenciapresenta: string | null;
    smotivodetencion: string | null;
    shoraarriboseparos: string | null;
    iidregistrodetencion: number;
    fuente?: string | null;
};

export class DetencionKardexDTO {
    idRegistroDetencion: number;
    idDetenido: number;
    fecha: string;
    horaArribo: string;
    tipoIngreso: string;
    lugarDetencion: string;
    agenciaPresenta: string;
    motivoDetencion: string;
    fuente: string;

    constructor(row: DetencionDb) {
        this.idRegistroDetencion = row.iidregistrodetencion;
        this.idDetenido = row.iiddetenido;
        this.fecha = row.dtfecha ?? 'N/A';
        this.horaArribo = row.shoraarriboseparos ?? 'N/A';
        this.tipoIngreso = clean(row.stipoingreso) || 'Sin tipo de ingreso';
        this.lugarDetencion = clean(row.slugardetencion) || 'Sin lugar registrado';
        this.agenciaPresenta = clean(row.sagenciapresenta) || 'Sin agencia registrada';
        this.motivoDetencion = clean(row.smotivodetencion) || 'Sin motivo registrado';
        this.fuente = clean(row.fuente) || 'N/A';
    }
}

export class ResumenDetencionesDTO {
    total: number;
    faltasAdministrativas: number;
    puestasDisposicion: number;
    depositos: number;
    historicas: number;
    actuales: number;
    ultimaDetencion: DetencionKardexDTO | null;

    constructor(detenciones: DetencionKardexDTO[]) {
        this.total = detenciones.length;

        this.faltasAdministrativas = detenciones.filter(x =>
            normalize(x.tipoIngreso).includes('FALTA ADMINISTRATIVA')
        ).length;

        this.puestasDisposicion = detenciones.filter(x =>
            normalize(x.tipoIngreso).includes('PUESTA A DISPOSICION')
        ).length;

        this.depositos = detenciones.filter(x =>
            normalize(x.tipoIngreso).includes('DEPOSITO')
        ).length;

        this.historicas = detenciones.filter(x =>
            normalize(x.fuente).includes('HISTORICO')
        ).length;

        this.actuales = detenciones.filter(x =>
            normalize(x.fuente).includes('ACTUAL')
        ).length;

        this.ultimaDetencion = detenciones[0] ?? null;
    }
}

export class KardexDetenidoDTO {
    idDetenido: number;

    nombreCompleto: string;
    alias: string;
    domicilio: string;
    fechaNacimiento: string;
    origen: string;
    edad: number | string;
    gradoEstudios: string;
    sexo: string;
    estadoCivil: string;
    conyuge: string;
    ingresoSemanal: number | string;

    dataOosto: KardexOostoDTO;

    resumen: ResumenDetencionesDTO;
    detenciones: DetencionKardexDTO[];

    constructor(row: any, oosto?: any) {
        const detencionesRaw = parseJsonArray(row?.detenciones_anteriores);

        const detencionActual = row?.iidregistrodetencion
            ? [{
                dtfecha: row.dtfecha,
                iiddetenido: row.iiddetenido,
                stipoingreso: row.stipoingreso,
                slugardetencion: row.slugardetencion,
                sagenciapresenta: row.sagenciapresenta,
                smotivodetencion: row.smotivodetencion,
                shoraarriboseparos: row.shoraarriboseparos,
                iidregistrodetencion: row.iidregistrodetencion,
                fuente: row.fuente
            }]
            : [];

        this.idDetenido = row?.iiddetenido ?? 0;

        this.nombreCompleto = clean(row?.nombre_completo) || 'Sin nombre registrado';
        this.alias = clean(row?.salias) || 'N/A';
        this.domicilio = clean(row?.sdomicilio) || 'Sin domicilio registrado';
        this.fechaNacimiento = row?.dtfechanacimiento ?? 'N/A';
        this.origen = clean(row?.sorigen) || 'Sin origen registrado';
        this.edad = row?.edad ?? 'N/A';
        this.gradoEstudios = clean(row?.sgradoestudios) || 'Sin grado registrado';
        this.sexo = clean(row?.ssexo) || 'N/A';
        this.estadoCivil = clean(row?.sestadocivil) || 'N/A';
        this.conyuge = clean(row?.sconyuge) || 'N/A';
        this.ingresoSemanal = row?.iingresosemanal ?? 0;

        this.dataOosto = new KardexOostoDTO(oosto);

        this.detenciones = [...detencionActual, ...detencionesRaw]
            .map((item: DetencionDb) => new DetencionKardexDTO(item))
            .sort((a, b) => {
                const fechaA = toDateTime(a.fecha, a.horaArribo);
                const fechaB = toDateTime(b.fecha, b.horaArribo);
                return fechaB - fechaA;
            });

        this.resumen = new ResumenDetencionesDTO(this.detenciones);
    }
}

export class KardexOostoDTO {
    idOosto: string;
    nombreOosto: string;
    imageUrl: string;
    detectionImage: string;
    score: number | string;
    camera: string;
    fechaDeteccion: string;

    constructor(row: any) {
        this.idOosto = clean(row?.idOosto || row?.subjectId || row?.subject?.id);
        this.nombreOosto = clean(row?.nombre || row?.name || row?.subject?.name);
        this.imageUrl = clean(row?.imageUrl || row?.subject?.imageUrl || row?.subject?.image?.url);
        this.detectionImage = clean(row?.detectionImage || row?.detectionImageUrl || row?.images?.[0]?.url);
        this.score = row?.score ?? row?.subjectScore ?? row?.metadata?.subjectScore ?? 'N/A';
        this.camera = clean(row?.camera || row?.cameraTitle || row?.camera?.title) || 'Sin cámara';
        this.fechaDeteccion = clean(row?.fechaDeteccion || row?.frameTimeStamp) || 'N/A';
    }
}

function clean(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function normalize(value: string): string {
    return clean(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

function parseJsonArray(value: any): any[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    try {
        return JSON.parse(value);
    } catch {
        return [];
    }
}

function toDateTime(fecha: string, hora: string): number {
    if (!fecha || fecha === 'N/A') return 0;

    const safeHora = hora && hora !== 'N/A' ? hora : '00:00:00';
    const value = new Date(`${fecha}T${safeHora}`).getTime();

    return Number.isNaN(value) ? 0 : value;
}