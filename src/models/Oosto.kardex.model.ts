export const mapKardexOosto = (data: any) => {
    return {
        subjectId: data?.id,
        nombre: data?.name,
        imageUrl: data?.image?.url,
    };
};