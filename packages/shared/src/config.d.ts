/**
 * Shared Configuration
 */
export declare const config: {
    database: {
        url: string;
    };
    redis: {
        url: string;
    };
    ports: {
        bap: number;
        cds: number;
        bpp: number;
    };
    urls: {
        bap: string;
        cds: string;
        bpp: string;
    };
    bap: {
        id: string;
        uri: string;
    };
    bpp: {
        id: string;
        uri: string;
    };
    cds: {
        id: string;
        uri: string;
    };
    callbackDelay: number;
    matching: {
        weights: {
            price: number;
            trust: number;
            timeWindowFit: number;
        };
        minTrustThreshold: number;
        defaultTrustScore: number;
    };
};
