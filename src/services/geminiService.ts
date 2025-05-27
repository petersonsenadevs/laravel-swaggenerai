import { GoogleGenerativeAI } from '@google/generative-ai';
import { RelatedFiles } from '../types';

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    async generateSwaggerDoc(files: RelatedFiles): Promise<string> {
        try {
            const prompt = this.buildPrompt(files);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error generating Swagger documentation:', error);
            throw error;
        }
    }

    private buildPrompt(files: RelatedFiles): string {
        let prompt = `Generate OpenAPI/Swagger documentation in YAML format for the following Laravel files:\n\n`;

        if (files.controller) {
            prompt += `Controller (${files.controller.path}):\n${files.controller.content}\n\n`;
        }

        if (files.routes && files.routes.length > 0) {
            prompt += `Routes:\n${files.routes.map(r => r.content).join('\n')}\n\n`;
        }

        if (files.requests && files.requests.length > 0) {
            prompt += `Form Requests:\n${files.requests.map(r => r.content).join('\n')}\n\n`;
        }

        prompt += `Focus on:
1. API endpoints
2. Request methods
3. Request parameters and validation rules
4. Response structure
5. Authentication requirements

Please generate valid OpenAPI/Swagger YAML.`;

        return prompt;
    }
}
