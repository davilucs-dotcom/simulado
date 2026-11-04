import { Router } from 'express';
import { IdSchema } from '../contracts';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { TentativaService } from '../services/tentativa.service';

export const simuladosRouter = Router();
simuladosRouter.use(requireAuth);

simuladosRouter.get('/', async (_req, res) => {
  const simulados = await prisma.simulado.findMany({
    where: { publicado: true },
    orderBy: { criadoEm: 'desc' },
    include: { _count: { select: { questoes: true } } },
  });
  res.json(
    simulados.map((s) => ({
      id: s.id,
      titulo: s.titulo,
      descricao: s.descricao,
      duracaoMin: s.duracaoMin,
      totalQuestoes: s._count.questoes,
    }))
  );
});

simuladosRouter.post('/:id/tentativas', async (req, res) => {
  const simuladoId = IdSchema.parse(req.params.id);
  const resultado = await TentativaService.iniciarTentativa(req.aluno!.id, simuladoId);
  res.status(201).json(resultado);
});