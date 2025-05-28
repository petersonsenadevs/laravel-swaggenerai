export interface EndpointCache {
    timestamp: number;
    endpoints: {
        [controller: string]: {
            [method: string]: {
                hasAnnotation: boolean;
                lastUpdated: number;
                filePath: string;
                fileHash: string;
            }
        }
    };
}

export interface MissingEndpoint {
    module: string;
    action: string;
    controller: {
        path: string;
        content: string;
        type: 'controller';
    };
    routes?: Array<{
        path: string;
        content: string;
        type: 'route';
    }>;
    requests?: Array<{
        path: string;
        content: string;
        type: 'request';
    }>;
}
