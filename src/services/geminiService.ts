import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAIService } from "./ai/BaseAIService";

export class GeminiService extends BaseAIService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        super(apiKey);
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.1,
                topP: 0.8,
                topK: 40,
            },
        });
    }

    public async generateContent(prompt: string): Promise<string> {
        const response = await this.model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
            },
        });
        return response.response.text();
    }

    async validateApiKey(): Promise<boolean> {
        try {
            await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: "test" }] }]
            });
            return true;
        }catch (error) {
            if (error instanceof Error) {
                throw new Error(error.message);
            }
            throw new Error('An unknown error occurred');
        }
    }
}