import { RelatedFiles } from '../../types';

export interface SwaggerAnnotation {
    module: string;
    action: string;
    content: string;
}

export interface GeneratedDocs {
    baseConfig?: string;
    endpoints: SwaggerAnnotation[];
}

export interface IAIService {
    generateSwaggerDoc(files: RelatedFiles): Promise<GeneratedDocs>;
    validateApiKey(): Promise<boolean>;
}