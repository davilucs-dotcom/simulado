import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'mock-key' });

export class IAService {
  static async explicarQuestao(enunciado: string, gabaritoOficial: string, justificativaProfessor: string | null): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return `[IA - Modo Simulado]: A alternativa correta é (${gabaritoOficial}). ${justificativaProfessor ?? 'Estude os conceitos fundamentais deste tópico para o ENADE 2026.'}`;
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um professor universitário especialista em Ciência da Computação ajudando alunos a se prepararem para o ENADE. Explique de forma didática, clara e objetiva o porquê da resposta correta e desmistifique as pegadinhas.'
          },
          {
            role: 'user',
            content: `Questão: "${enunciado}"\nGabarito Oficial: ${gabaritoOficial}\nJustificativa base: ${justificativaProfessor ?? 'N/A'}\n\nPor favor, elabore uma explicação pedagógica detalhada para o aluno.`
          }
        ],
        temperature: 0.7,
        max_tokens: 400,
      });

      return response.choices[0].message.content ?? 'Não foi possível gerar a explicação.';
    } catch (error) {
      console.error('Erro na API de IA:', error);
      return `A alternativa correta é (${gabaritoOficial}). ${justificativaProfessor ?? ''}`;
    }
  }
}
