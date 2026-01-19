
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  async polishMarkdown(content: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `你是一个专业的文案编辑。请润色以下 Markdown 文本，使其逻辑更清晰、表达更专业，但保留原有的格式。请直接返回修改后的 Markdown：\n\n${content}` }] }],
      });
      return response.text || content;
    } catch (error) {
      console.error("AI 润色失败:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
