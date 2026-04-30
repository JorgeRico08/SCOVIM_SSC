import { poolGD } from "../db/context";

export async function getKardexDelictivo(idDetenido: string) {
    try {
        const query = `
        SELECT (fn_kardex_detenido($1)).*;
    `;
        const { rows } = await poolGD.query(query, [idDetenido]);
        if (!rows.length) return null;
        return rows[0];
    } catch (err) {
        console.error('Error al consultar:', err);
        return null;
    }
}
