import { ErrorDTO } from './dto/error.dto';

export class ResponseDTO<T> {
    iCode: number;
    sMensaje: string;
    aData?: T;
    aErrores?: ErrorDTO[];

    constructor(
        iCode: number,
        sMensaje: string,
        aData?: T,
        aErrores?: ErrorDTO[]
    ) {
        this.iCode = iCode;
        this.sMensaje = sMensaje;
        this.aData = aData;
        this.aErrores = aErrores;
    }

    // ✅ Respuesta OK
    static ok<T>(data: T, mensaje = 'OK'): ResponseDTO<T> {
        return new ResponseDTO<T>(200, mensaje, data, []);
    }

    // ✅ Respuesta sin contenido
    static empty<T>(mensaje = 'Sin resultados'): ResponseDTO<T> {
        return new ResponseDTO<T>(204, mensaje, undefined, []);
    }

    // ❌ Error simple
    static error<T>(mensaje = 'Error interno'): ResponseDTO<T> {
        return new ResponseDTO<T>(500, mensaje, undefined, [
            new ErrorDTO('GENERAL', mensaje)
        ]);
    }

    // ❌ Error con lista
    static errorList<T>(
        mensaje: string,
        errores: ErrorDTO[]
    ): ResponseDTO<T> {
        return new ResponseDTO<T>(400, mensaje, undefined, errores);
    }
}