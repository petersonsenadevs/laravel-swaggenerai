export interface LaravelFile {
    path: string;
    content: string;
    type: 'controller' | 'route' | 'request';
}

export interface RelatedFiles {
    controller?: LaravelFile;
    routes?: LaravelFile[];
    requests?: LaravelFile[];
}

export interface SwaggerAnnotation {
    module: string;
    action: string;
    content: string;
}

export interface SwaggerConfig {
    info: {
        title: string;
        version: string;
        description?: string;
        termsOfService?: string;
        contact?: {
            name?: string;
            url?: string;
            email?: string;
        };
        license?: {
            name: string;
            url?: string;
        };
    };
    servers: Array<{
        url: string;
        description?: string;
    }>;
    security?: {
        type: string;
        description?: string;
        name?: string;
        in?: string;
        scheme?: string;
        bearerFormat?: string;
        securityScheme?: string;
    };
}

export interface SwaggerEndpoint {
    path: string;
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    summary: string;
    description?: string;
    tags: string[];
    requestBody?: {
        required: boolean;
        content: {
            [key: string]: {
                schema: {
                    properties: Record<string, {
                        type: string;
                        format?: string;
                        description?: string;
                        example?: any;
                    }>;
                    required?: string[];
                }
            }
        }
    };
    responses: {
        [key: string]: {
            description: string;
            content?: {
                [key: string]: {
                    schema: {
                        properties?: Record<string, any>;
                        type?: string;
                    }
                }
            }
        }
    };
}

export interface GeneratedDocs {
    baseConfig: string;
    endpoints: SwaggerAnnotation[];
}