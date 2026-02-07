import * as vscode from "vscode";
import * as path from "path";
import { RelatedFiles, SwaggerAnnotation, GeneratedDocs } from "../../types";
import { IAIService } from "./IAIService";

export abstract class BaseAIService implements IAIService {
    protected readonly MAX_RETRIES = 3;
    protected readonly RETRY_DELAY = 2000;

  constructor(protected apiKey: string) {
    /*     if (!apiKey) {
            throw new Error("API key is required");
        } */
    }

    abstract generateContent(prompt: string): Promise<string>;
    abstract validateApiKey(): Promise<boolean>;

    protected async retry<T>(
        operation: () => Promise<T>,
        retries = this.MAX_RETRIES
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
                return this.retry(operation, retries - 1);
            }
            throw error;
        }
    }

    protected cleanPhpContent(content: string): string {
        let cleanContent = content
            .replace(/^```php\n/, '')
            .replace(/\n```$/, '')
            .trim();

        if (content === cleanContent) {
            const parts = content.split('<?php').filter(Boolean);
            if (parts.length > 1) {
                cleanContent = '<?php\n\n' + parts[parts.length - 1].trim();
            }
        }

        cleanContent = cleanContent.replace(
            /@OA\\Items\(ref="#\/components\/schemas\/[^"]+"\)/g,
            '@OA\\Items(type="object", @OA\\Property(property="id", type="integer"), @OA\\Property(property="url", type="string"), @OA\\Property(property="short_url", type="string"), @OA\\Property(property="created_at", type="string", format="date-time"), @OA\\Property(property="updated_at", type="string", format="date-time"))'
        );

        return cleanContent;
    }

    async generateSwaggerDoc(files: RelatedFiles): Promise<GeneratedDocs> {
        const baseConfig = await this.generateBaseConfig(files);
        const endpoints = await this.generateEndpointDocs(files);
        return { baseConfig, endpoints };
    }

    protected async generateBaseConfig(files: RelatedFiles): Promise<string> {
        const prompt = this.getBaseConfigPrompt(files);
        return this.retry(async () => {
            const response = await this.generateContent(prompt);
            return this.cleanPhpContent(response);
        });
    }

    protected async generateEndpointDocs(files: RelatedFiles): Promise<SwaggerAnnotation[]> {
        if (!files.controller) {
            return [];
        }

        const endpoints: SwaggerAnnotation[] = [];
        const methodRegex = /public function (\w+)\s*\([^)]*\)/g;
        const controllerName = path
            .basename(files.controller.path, '.php')
            .replace('Controller', '');

        // Detectar si el provider es Ollama (por nombre de clase)
        const isOllama = this.constructor.name.toLowerCase().includes('ollama');
        // Delay recomendado para rate limit (en ms)
        const cloudDelay = 2000;

        let match;
        while ((match = methodRegex.exec(files.controller.content)) !== null) {
            const methodName = match[1];

            if (methodName === '__construct') {
                continue;
            }

            const prompt = this.getEndpointPrompt(files, controllerName, methodName);

            try {
                const content = await this.retry(async () => {
                    const response = await this.generateContent(prompt);
                    return this.cleanPhpContent(response);
                });

                endpoints.push({
                    module: controllerName,
                    action: methodName,
                    content,
                });

                // Solo aplicar delay si NO es Ollama
                if (!isOllama) {
                    await new Promise(res => setTimeout(res, cloudDelay));
                }
            } catch (err) {
                vscode.window.showWarningMessage(
                    `Error generando documentación para ${methodName}: ${err}`
                );
            }
        }

        return endpoints;
    }

    protected getBaseConfigPrompt(files: RelatedFiles): string {
        return `Genera un bloque de código PHP con anotaciones Swagger/OpenAPI para la configuración base.
Devuelve el código dentro de un bloque markdown \`\`\`php.

El contenido debe seguir EXACTAMENTE esta estructura:

\`\`\`php
<?php

namespace App\\Annotations\\Swagger;

use OpenApi\\Annotations as OA;

/**
 * @OA\\Info(
 *     version="1.0.0",
 *     title="API Documentation",
 *     description="API documentation"
 * )
 * @OA\\Server(...)
 * @OA\\SecurityScheme(...)
 */
class AnnotationsInfo
{
    public function register() {}
}
\`\`\`

Las anotaciones deben incluir:
1. @OA\\Info con título, versión, descripción, términos, contacto y licencia MIT
2. @OA\\Server para local (http://localhost:8000/api) y producción
3. @OA\\SecurityScheme para JWT bearer

Analiza este código:
${files.controller ? `\nController: ${files.controller.content}` : ""}
${files.routes?.map((r) => `\nRoute: ${r.content}`).join("")}`;
    }

    protected getEndpointPrompt(files: RelatedFiles, controllerName: string, methodName: string): string {
        return `Genera un bloque de código PHP con anotaciones Swagger/OpenAPI.
Devuelve el código dentro de un bloque markdown \`\`\`php.

IMPORTANTE:
- NO uses referencias a schemas ($ref o ref=)
- el resumen y la descripcion tienen que ser en ingles
- Para arrays, define las propiedades directamente, ejemplo:
  @OA\\JsonContent(
      type="array",
      @OA\\Items(
          type="object",
          @OA\\Property(property="id", type="integer"),
          @OA\\Property(property="url", type="string"),
          @OA\\Property(property="short_url", type="string"),
          @OA\\Property(property="created_at", type="string", format="date-time"),
          @OA\\Property(property="updated_at", type="string", format="date-time")
      )
  )

El contenido debe seguir EXACTAMENTE esta estructura:

\`\`\`php
<?php

namespace App\\Annotations\\Swagger\\${controllerName}\\${methodName};

use OpenApi\\Annotations as OA;

/**
 * @OA\\[Método](
 *     path="...",
 *     tags={"..."}
 * )
 */
class ${methodName}Annotations
{
    public function register() {}
}
\`\`\`

Información del endpoint:
Controller: ${files.controller?.content ?? ''}
${files.routes?.map(r => `\nRoute: ${r.content}`).join('\n')}
${files.requests?.map(r => `\nRequest: ${r.content}`).join('\n')}`;
    }
}
