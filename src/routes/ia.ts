import { Router } from 'express';
import { IdSchema } from '../contracts';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';
import { ErroHttp } from '../middleware/erros';
import { IAService } from '../services/ia.service';

export const iaRouter = Router();
iaRouter.use(requireAuth);

iaRouter.post('/questoes/:id/explicar', async (req, res) => {
  const questaoId = IdSchema.parse(req.params.id);

  const questao = await prisma.questao.findUnique({
    where: { id: questaoId },
    include: { gabarito: true },
  });

  if (!questao || !questao.gabarito) {
    throw new ErroHttp(404, 'Questão ou gabarito não encontrado.');
  }

  const explicacaoIA = await IAService.explicarQuestao(
    questao.enunciado,
    questao.gabarito.alternativaCorreta,
    questao.gabarito.justificativa
  );

  res.json({ questaoId, explicacaoIA });
});
