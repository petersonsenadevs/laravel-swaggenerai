import OpenAI from 'openai';
import { BaseAIService } from './ai/BaseAIService';

export class OpenAIService extends BaseAIService {
    private openai: OpenAI;

    constructor(apiKey: string) {
        super(apiKey);
        this.openai = new OpenAI({ apiKey });
    }

    public async generateContent(prompt: string): Promise<string> {
        const response = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "Eres un experto en Laravel y Swagger/OpenAPI. Genera código PHP con anotaciones OpenAPI precisas y bien estructuradas."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.1,
        });

        return response.choices[0].message.content || '';
    }

    async validateApiKey(): Promise<boolean> {
        try {
            await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "test" }],
                max_tokens: 5
            });
            return true;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(error.message);
            }
            throw new Error('An unknown error occurred');
        }
    }
}
