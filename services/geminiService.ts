
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private getClient() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("GeminiService: API_KEY is missing.");
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  async polishMarkdown(content: string, instruction: string = "Polish this markdown text for better clarity and flow.") {
    const ai = this.getClient();
    if (!ai) return content;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${instruction}\n\nReturn only the improved markdown content.\n\nContent:\n${content}`,
        config: {
            temperature: 0.7,
            topP: 0.95,
        }
      });
      return response.text || content;
    } catch (error) {
      console.error("Gemini Polish Error:", error);
      return content;
    }
  }

  async generateSummary(content: string) {
    const ai = this.getClient();
    if (!ai) return "AI service not configured.";
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize the following markdown document briefly:\n\n${content}`,
      });
      return response.text || "No summary available.";
    } catch (error) {
      console.error("Gemini Summary Error:", error);
      return "Error generating summary.";
    }
  }
}

export const geminiService = new GeminiService();
