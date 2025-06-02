import Anthropic from '@anthropic-ai/sdk';
import { BaseAIService } from './ai/BaseAIService';

export class AnthropicService extends BaseAIService {
    private anthropic: Anthropic;


    constructor(apiKey: string) {
        super(apiKey);
        this.anthropic = new Anthropic({ apiKey });
    }

 
    public async generateContent(prompt: string): Promise<string> {
        const response = await this.anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 4000,
            messages: [
                {
                    role: 'user',
                    content: `Eres un experto en Laravel y Swagger/OpenAPI. Genera código PHP con anotaciones OpenAPI precisas y bien estructuradas. ${prompt}`
                }
            ],
            temperature: 0.1,
        });

        return response.content[0].text;
    }

    async validateApiKey(): Promise<boolean> {
        try {
            await this.anthropic.messages.create({
                model: 'claude-3-opus-20240229',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'test' }]
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
    

