import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  RelatedFiles,
  SwaggerConfig,
  GeneratedDocs,
  SwaggerAnnotation,
} from "../types";
import * as vscode from "vscode";
import * as path from "path";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
      },
    });
  }

  private async retry<T>(
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

  private cleanPhpContent(content: string): string {
    // Solo eliminar los delimitadores markdown y limpiar espacios
    let cleanContent = content
        .replace(/^```php\n/, '')
        .replace(/\n```$/, '')
        .trim();

    // Si no hay delimitadores markdown, intentar limpiar el contenido
    if (content === cleanContent) {
        const parts = content.split('<?php').filter(Boolean);
        if (parts.length > 1) {
            // Si hay múltiples bloques PHP, tomar el último completo
            cleanContent = '<?php\n\n' + parts[parts.length - 1].trim();
        }
    }

    // Reemplazar referencias a schemas con propiedades directas
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

  private async generateBaseConfig(files: RelatedFiles): Promise<string> {
    const prompt = `Genera un bloque de código PHP con anotaciones Swagger/OpenAPI para la configuración base.
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

    const result = await this.retry(async () => {
      const response = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
        },
      });
      return this.cleanPhpContent(response.response.text());
    });

    return result;
  }

private async generateEndpointDocs(files: RelatedFiles): Promise<SwaggerAnnotation[]> {
    if (!files.controller) {
        return [];
    }

    const endpoints: SwaggerAnnotation[] = [];
    const methodRegex = /public function (\w+)\s*\([^)]*\)/g;
    const controllerName = path
        .basename(files.controller.path, '.php')
        .replace('Controller', '');

    let match;
    while ((match = methodRegex.exec(files.controller.content)) !== null) {
        const methodName = match[1];

        // Saltar el constructor
        if (methodName === '__construct') {
            continue;
        }

        const prompt = `Genera un bloque de código PHP con anotaciones Swagger/OpenAPI.
Devuelve el código dentro de un bloque markdown \`\`\`php.

IMPORTANTE:
- NO uses referencias a schemas ($ref o ref=)
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
Controller: ${files.controller.content}
${files.routes?.map(r => `\nRoute: ${r.content}`).join('\n')}
${files.requests?.map(r => `\nRequest: ${r.content}`).join('\n')}`;

        try {
            const content = await this.retry(async () => {
                const response = await this.model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                    },
                });
                return this.cleanPhpContent(response.response.text());
            });

            endpoints.push({
                module: controllerName,
                action: methodName,
                content,
            });

            // Pausa entre generaciones
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
