import { GoogleGenerativeAI } from '@google/generative-ai';
import { RelatedFiles, SwaggerConfig, GeneratedDocs, SwaggerAnnotation } from '../types';
import * as vscode from 'vscode';
import * as path from 'path';

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY = 2000;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    private async retry<T>(operation: () => Promise<T>, retries = this.MAX_RETRIES): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.retry(operation, retries - 1);
            }
            throw error;
        }
    }

    async generateSwaggerDoc(files: RelatedFiles): Promise<GeneratedDocs> {
        // Generar configuración base
        const baseConfig = await this.generateBaseConfig(files);
        
        // Generar documentación de endpoints
        const endpoints = await this.generateEndpointDocs(files);

        return { baseConfig, endpoints };
    }

    private async generateBaseConfig(files: RelatedFiles): Promise<string> {
        const prompt = `Genera las anotaciones PHP para la configuración base de Swagger/OpenAPI para una API Laravel.
        Usa el formato de anotaciones de darkaonline/l5-swagger con 'OpenApi\\Annotations as OA'.
        
        Las anotaciones deben incluir:
        1. @OA\\Info con:
           - título
           - versión
           - descripción
           - términos de servicio
           - contacto (nombre, url, email)
           - licencia (MIT)
        2. @OA\\Server para:
           - servidor local (http://localhost:8000/api) 
           - servidor de producción (dedúcelo del código)
        3. @OA\\SecurityScheme para autenticación JWT (Si la API usa JWT)
        
        Analiza este código para extraer información relevante:
        ${files.controller ? `\nController: ${files.controller.content}` : ''}
        ${files.routes?.map(r => `\nRoute: ${r.content}`).join('')}
        
        Responde SOLO con las anotaciones PHP, sin la clase ni namespace.`;

        const result = await this.retry(async () => {
            const response = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            });
            return response.response.text();
        });

        return result;
    }

    private async generateEndpointDocs(files: RelatedFiles): Promise<SwaggerAnnotation[]> {
        if (!files.controller) {
            return [];
        }

        const endpoints: SwaggerAnnotation[] = [];
        const methodRegex = /public function (\w+)\s*\([^)]*\)/g;
        const controllerName = path.basename(files.controller.path, '.php')
            .replace('Controller', '');
        
        let match;
        while ((match = methodRegex.exec(files.controller.content)) !== null) {
            const methodName = match[1];
            
            // Construir prompt para el endpoint
            const prompt = `Genera las anotaciones PHP para este endpoint de Laravel usando darkaonline/l5-swagger.
            Usa 'OpenApi\\Annotations as OA' y coloca las anotaciones antes del método.
            
            Controller: ${files.controller.content}
            ${files.routes?.map(r => `Route: ${r.content}`).join('\n')}
            ${files.requests?.map(r => `Request: ${r.content}`).join('\n')}
            
            Para el método: ${methodName}
            
            Incluye:
            1. @OA\\[Método] con:
               - path (extráelo de las rutas)
               - tags (usa el nombre del controlador)
               - summary
               - description
            2. @OA\\RequestBody (si aplica) con:
               - required
               - @OA\\JsonContent
               - @OA\\Property para cada campo
            3. @OA\\Response para:
               - 2XX (éxito)
               - 422 (validación)
               - 401 (no autorizado)
               Cada response debe tener su @OA\\JsonContent
            
            Responde SOLO con las anotaciones PHP, sin la clase ni namespace.`;

            try {
                const content = await this.retry(async () => {
                    const response = await this.model.generateContent({
                        contents: [{ role: "user", parts: [{ text: prompt }] }]
                    });
                    return response.response.text();
                });

                endpoints.push({
                    module: controllerName,
                    action: methodName,
                    content
                });

                // Pausa para evitar sobrecarga
                await new Promise(res => setTimeout(res, 1000));
            } catch (err) {
                vscode.window.showWarningMessage(
                    `Error generando documentación para ${methodName}: ${err}`
                );
            }
        }

        return endpoints;
    }
}