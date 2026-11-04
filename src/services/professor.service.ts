import { prisma } from '../prisma';

export class ProfessorService {
  static async obterDesempenhoTurma() {
    const tentativas = await prisma.tentativa.findMany({
      where: { status: 'FINALIZADA' },
      include: { 
        respostas: { 
          include: { 
            questao: { 
              include: { topico: true } 
            } 
          } 
        } 
      }
    });

    const stats: Record<string, { acertos: number, total: number }> = {};
    
    tentativas.forEach(t => {
      t.respostas.forEach(r => {
        const topico = r.questao.topico.nome;
        if (!stats[topico]) stats[topico] = { acertos: 0, total: 0 };
        stats[topico].total += 1;
        if (r.correta) stats[topico].acertos += 1;
      });
    });

    return Object.entries(stats).map(([nome, data]) => ({
      topico: nome,
      acertos: data.acertos,
      total: data.total,
      percentual: Number(((data.acertos / data.total) * 100).toFixed(2))
    }));
  }
}
