import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { QuestaoFiltroQuerySchema } from '../contracts';

export const questoesRouter = Router();
questoesRouter.use(requireAuth);

questoesRouter.get('/', async (req, res) => {
  const query = QuestaoFiltroQuerySchema.parse(req.query);

  const whereClause: any = {};
  if (query.topico) {
    whereClause.topico = { nome: { contains: query.topico, mode: 'insensitive' } };
  }
  if (query.edicao) {
    whereClause.edicaoEnade = query.edicao;
  }
  if (query.prioridadeMin) {
    whereClause.prioridade = { gte: query.prioridadeMin };
  }

  const questoes = await prisma.questao.findMany({
    where: whereClause,
    orderBy: [{ prioridade: 'desc' }, { edicaoEnade: 'desc' }],
    include: {
      topico: { include: { disciplina: true } },
      alternativas: { orderBy: { letra: 'asc' } },
      gabarito: true,
    },
  });

  res.json(
    questoes.map((q) => ({
      id: q.id,
      enunciado: q.enunciado,
      dificuldade: q.dificuldade,
      prioridade: q.prioridade,
      edicaoEnade: q.edicaoEnade,
      disciplina: q.topico.disciplina.nome,
      topico: q.topico.nome,
      alternativas: q.alternativas.map((a) => ({ letra: a.letra, texto: a.texto })),
      gabarito: q.gabarito
        ? {
            alternativaCorreta: q.gabarito.alternativaCorreta,
            justificativa: q.gabarito.justificativa,
          }
        : null,
    }))
  );
});

questoesRouter.get('/topicos', async (_req, res) => {
  const topicos = await prisma.topico.findMany({
    include: {
      disciplina: true,
      _count: { select: { questoes: true } },
    },
    orderBy: { nome: 'asc' },
  });

  res.json(
    topicos.map((t) => ({
      id: t.id,
      nome: t.nome,
      disciplina: t.disciplina.nome,
      totalQuestoes: t._count.questoes,
    }))
  );
});

questoesRouter.get('/prioritarias-enade', async (_req, res) => {
  const questoes = await prisma.questao.findMany({
    where: { prioridade: { gte: 4 } },
    orderBy: { prioridade: 'desc' },
    take: 20,
    include: {
      topico: { include: { disciplina: true } },
      alternativas: { orderBy: { letra: 'asc' } },
      gabarito: true,
    },
  });

  res.json(
    questoes.map((q) => ({
      id: q.id,
      enunciado: q.enunciado,
      prioridade: q.prioridade,
      edicaoEnade: q.edicaoEnade,
      disciplina: q.topico.disciplina.nome,
      topico: q.topico.nome,
      alternativas: q.alternativas.map((a) => ({ letra: a.letra, texto: a.texto })),
      gabarito: q.gabarito
        ? {
            alternativaCorreta: q.gabarito.alternativaCorreta,
            justificativa: q.gabarito.justificativa,
          }
        : null,
    }))
  );
});
