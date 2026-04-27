export const obtenerKardexPorSubjectId = async (subjectId: string) => {
    return {
        subjectId,
        nombre: 'Nombre de prueba',
        alias: 'Alias de prueba',
        edad: 30,
        hechosDelictivos: [
            {
                fecha: '2026-04-26',
                tipo: 'Falta administrativa',
                descripcion: 'Registro de prueba para kardex'
            }
        ]
    };
};