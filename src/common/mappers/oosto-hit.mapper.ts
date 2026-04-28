export type OostoHitImageDTO = {
    url: string;
    imageType: number;
    featuresQuality: number;
};

export type OostoHitViewDTO = {
    id: string;
    frameTimeStamp: string;

    camera: {
        id: string;
        title: string;
        location: {
            lng: number | null;
            lat: number | null;
        };
    };

    subject: {
        id: string;
        name: string;
        imageUrl: string | null;
    };

    score: number | null;

    detectionImageUrl: string | null;

    images: OostoHitImageDTO[];
};

export const mapOostoHitToView = (hit: any): OostoHitViewDTO => {
    const location = hit?.camera?.location ?? [];

    const images: OostoHitImageDTO[] = (hit?.images ?? [])
        .map((img: any) => ({
            url: img?.url ?? '',
            imageType: img?.imageType ?? 0,
            featuresQuality: img?.featuresQuality ?? 0
        }))
        .filter((img: OostoHitImageDTO) => img.url)
        .sort((a: OostoHitImageDTO, b: OostoHitImageDTO) => {
            if (a.imageType !== b.imageType) return a.imageType - b.imageType;
            return a.url.localeCompare(b.url);
        });

    const detectionImage =
        images.find(x => x.imageType === 0)?.url ||
        images[0]?.url ||
        null;

    return {
        id: hit?.id ?? '',
        frameTimeStamp: hit?.frameTimeStamp ?? '',

        camera: {
            id: hit?.camera?.id ?? '',
            title: hit?.camera?.title ?? 'Sin cámara',
            location: {
                lng: location?.[0] ?? null,
                lat: location?.[1] ?? null,
            },
        },

        subject: {
            id: hit?.subject?.id ?? hit?.metadata?.subjectId ?? '',
            name: hit?.subject?.name ?? 'Sujeto detectado',
            imageUrl: hit?.subject?.image?.url ?? null,
        },

        score:
            hit?.subjectScore ??
            hit?.metadata?.subjectScore ??
            hit?.closeMatches?.[0]?.score ??
            null,

        detectionImageUrl: detectionImage,

        images
    };
};