import { GoogleGenAI } from "@google/genai";
import { Occurrence } from "../types";

// Initialize the AI client
// Note: API KEY must be provided in environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDailyReport = async (occurrences: Occurrence[], userRole: string): Promise<string> => {
  try {
    // Prepare a summary of data for the AI
    const dataSummary = occurrences.map(o => ({
      id: o.id,
      tipo: o.category,
      motivo: o.reason,
      status: o.status,
      descricao: o.description,
      tecnico: o.userName,
      hora: o.time
    }));

    const prompt = `
      Aja como um Especialista em Operações de Campo e Inteligência de Dados.
      O usuário atual é um ${userRole}.
      
      Analise os seguintes dados brutos do "Diário de Bordo" de hoje:
      ${JSON.stringify(dataSummary).slice(0, 10000)} // Limit context window safety

      Gere um Relatório Diário Executivo em Markdown.
      Estrutura do relatório:
      1. **Resumo Geral**: Visão rápida do dia (volume, categorias principais).
      2. **Top 3 Ofensores**: Os motivos que mais impactaram a operação.
      3. **Análise de Anomalias**: Algo fugiu do padrão? (Horários, técnicos específicos).
      4. **Recomendações de Ação**: O que o ${userRole} deve fazer agora para mitigar riscos?

      Seja direto, profissional e use formatação clara (bullet points, negrito).
    `;

    // FIX: Using recommended gemini-3-flash-preview model for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar o relatório no momento.";
  } catch (error) {
    console.error("Error generating AI report:", error);
    return "Erro ao conectar com a IA. Verifique sua chave de API ou tente novamente mais tarde.";
  }
};
