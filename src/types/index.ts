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

export interface SwaggerDoc {
    paths: Record<string, any>;
    components: Record<string, any>;
}
