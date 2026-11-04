import { Router } from 'express';
import { FinalizarTentativaBodySchema, IdSchema } from '../contracts';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { TentativaService } from '../services/tentativa.service';

export const tentativasRouter = Router();
tentativasRouter.use(requireAuth);

tentativasRouter.get('/minhas', async (req, res) => {
  const tentativas = await prisma.tentativa.findMany({
    where: { alunoId: req.aluno!.id, status: 'FINALIZADA' },
    orderBy: { finalizadaEm: 'desc' },
    include: { simulado: { select: { titulo: true } }, alerta: { select: { id: true } } },
  });
  res.json(
    tentativas.map((t) => ({
      id: t.id,
      simulado: t.simulado.titulo,
      nota: t.nota === null ? null : Number(t.nota),
      finalizadaEm: t.finalizadaEm?.toISOString() ?? null,
      alertaMonitoria: t.alerta !== null,
    }))
  );
});

tentativasRouter.post('/:id/finalizar', async (req, res) => {
  const id = IdSchema.parse(req.params.id);
  const { respostas } = FinalizarTentativaBodySchema.parse(req.body);
  const resultado = await TentativaService.finalizarTentativa(req.aluno!.id, id, respostas);
  res.json(resultado);
});

tentativasRouter.get('/:id', async (req, res) => {
  const id = IdSchema.parse(req.params.id);
  const detalhes = await TentativaService.obterDetalhesTentativa(req.aluno!.id, id);
  res.json(detalhes);
});