import { prisma } from '../prisma';
import { ErroHttp } from '../middleware/erros';
import { corrigir } from '../domain/correcao';
import { avaliarDesempenho } from '../domain/desempenho';
import { config } from '../config';

const TOLERANCIA_MS = 30_000;

export class TentativaService {
  static async iniciarTentativa(alunoId: string, simuladoId: string) {
    const simulado = await prisma.simulado.findFirst({
      where: { id: simuladoId, publicado: true },
      include: {
        questoes: {
          orderBy: { ordem: 'asc' },
          include: {
            questao: {
              include: {
                topico: { include: { disciplina: true } },
                alternativas: { orderBy: { letra: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!simulado) throw new ErroHttp(404, 'Simulado não encontrado.');

    let tentativa = await prisma.tentativa.findFirst({
      where: { alunoId, simuladoId, status: 'EM_ANDAMENTO', prazoEm: { gt: new Date() } },
    });

    if (!tentativa) {
      tentativa = await prisma.tentativa.create({
        data: { alunoId, simuladoId, prazoEm: new Date(Date.now() + simulado.duracaoMin * 60_000) },
      });
    }

    return {
      tentativaId: tentativa.id,
      titulo: simulado.titulo,
      segundosRestantes: Math.max(0, Math.floor((tentativa.prazoEm.getTime() - Date.now()) / 1000)),
      questoes: simulado.questoes.map((sq) => ({
        id: sq.questao.id,
        enunciado: sq.questao.enunciado,
        disciplina: sq.questao.topico.disciplina.nome,
        topico: sq.questao.topico.nome,
        alternativas: sq.questao.alternativas.map((a) => ({ letra: a.letra, texto: a.texto })),
      })),
    };
  }

  static async finalizarTentativa(alunoId: string, tentativaId: string, respostas: { questaoId: string; alternativa: string }[]) {
    const tentativa = await prisma.tentativa.findFirst({ where: { id: tentativaId, alunoId } });
    if (!tentativa) throw new ErroHttp(404, 'Tentativa não encontrada.');
    if (tentativa.status !== 'EM_ANDAMENTO') throw new ErroHttp(409, 'Tentativa já finalizada.');

    if (Date.now() > tentativa.prazoEm.getTime() + TOLERANCIA_MS) {
      await prisma.tentativa.update({ where: { id: tentativaId }, data: { status: 'EXPIRADA', finalizadaEm: new Date() } });
      throw new ErroHttp(409, 'Prazo encerrado.');
    }

    const itens = await prisma.simuladoQuestao.findMany({
      where: { simuladoId: tentativa.simuladoId },
      include: { questao: { include: { gabarito: true, topico: { include: { disciplina: true } } } } },
    });

    const gabarito = itens.map((i) => {
      if (!i.questao.gabarito) throw new ErroHttp(500, `Questão ${i.questaoId} sem gabarito.`);
      return {
        questaoId: i.questaoId,
        correta: i.questao.gabarito.alternativaCorreta,
        disciplina: i.questao.topico.disciplina.nome,
        topico: i.questao.topico.nome,
      };
    });

    const resultado = corrigir(gabarito, respostas);
    const { precisaMonitoria } = avaliarDesempenho(resultado.nota, config.LIMIAR_MONITORIA);

    await prisma.$transaction(async (tx) => {
      const atualizadas = await tx.tentativa.updateMany({
        where: { id: tentativaId, status: 'EM_ANDAMENTO' },
        data: { status: 'FINALIZADA', finalizadaEm: new Date(), nota: resultado.nota },
      });
      if (atualizadas.count === 0) throw new ErroHttp(409, 'Tentativa já finalizada.');

      await tx.resposta.createMany({
        data: resultado.itens
          .filter((i) => i.escolhida !== null)
          .map((i) => ({ tentativaId, questaoId: i.questaoId, alternativa: i.escolhida as string, correta: i.correta })),
      });

      if (precisaMonitoria) {
        await tx.alertaMonitoria.create({
          data: { tentativaId, alunoId, nota: resultado.nota, limiar: config.LIMIAR_MONITORIA },
        });
      }
    });

    const itensComentados = itens.map((i) => {
      const res = resultado.itens.find((item) => item.questaoId === i.questaoId);
      return {
        questaoId: i.questaoId,
        enunciado: i.questao.enunciado,
        disciplina: i.questao.topico.disciplina.nome,
        topico: i.questao.topico.nome,
        escolhida: res?.escolhida ?? null,
        alternativaCorreta: i.questao.gabarito?.alternativaCorreta ?? '',
        correta: res?.correta ?? false,
        justificativa: i.questao.gabarito?.justificativa ?? null,
      };
    });

    return {
      tentativaId,
      nota: resultado.nota,
      acertos: resultado.acertos,
      total: resultado.total,
      porTopico: resultado.porTopico,
      itensComentados,
      alertaMonitoria: precisaMonitoria,
      limiar: config.LIMIAR_MONITORIA,
    };
  }

  static async obterDetalhesTentativa(alunoId: string, tentativaId: string) {
    const tentativa = await prisma.tentativa.findFirst({
      where: { id: tentativaId, alunoId },
      include: {
        simulado: { select: { titulo: true } },
        respostas: true,
        alerta: true,
      },
    });

    if (!tentativa) throw new ErroHttp(404, 'Tentativa não encontrada.');

    const itens = await prisma.simuladoQuestao.findMany({
      where: { simuladoId: tentativa.simuladoId },
      include: { questao: { include: { gabarito: true, topico: { include: { disciplina: true } } } } },
    });

    const respostasMap = new Map(tentativa.respostas.map((r) => [r.questaoId, r.alternativa]));

    const itensComentados = itens.map((i) => {
      const escolhida = respostasMap.get(i.questaoId) ?? null;
      const correta = escolhida !== null && i.questao.gabarito?.alternativaCorreta === escolhida;
      return {
        questaoId: i.questaoId,
        enunciado: i.questao.enunciado,
        disciplina: i.questao.topico.disciplina.nome,
        topico: i.questao.topico.nome,
        escolhida,
        alternativaCorreta: i.questao.gabarito?.alternativaCorreta ?? '',
        correta,
        justificativa: i.questao.gabarito?.justificativa ?? null,
      };
    });

    return {
      tentativaId: tentativa.id,
      simuladoTitulo: tentativa.simulado.titulo,
      nota: tentativa.nota === null ? null : Number(tentativa.nota),
      status: tentativa.status,
      finalizadaEm: tentativa.finalizadaEm?.toISOString() ?? null,
      itensComentados,
      alertaMonitoria: tentativa.alerta !== null,
    };
  }
}
