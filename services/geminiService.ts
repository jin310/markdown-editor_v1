import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    // 检查 process 环境，确保在浏览器中不会因为 process 未定义而崩溃
    try {
      const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
      if (apiKey) {
        this.ai = new GoogleGenAI({ apiKey });
      }
    } catch (e) {
      console.warn("GeminiService: Could not initialize AI client.", e);
    }
  }

  async polishMarkdown(content: string, instruction: string = "Polish this markdown text for better clarity and flow.") {
    if (!this.ai) return content;
    try {
      const response = await this.ai.models.generateContent({
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
    if (!this.ai) return "AI service not configured.";
    try {
      const response = await this.ai.models.generateContent({
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