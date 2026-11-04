import { Router } from 'express';
import { requireAuth, exigirProfessor } from '../middleware/auth';
import { ProfessorService } from '../services/professor.service';

export const professorRouter = Router();
professorRouter.use(requireAuth, exigirProfessor);

professorRouter.get('/dashboard', async (_req, res) => {
  const desempenho = await ProfessorService.obterDesempenhoTurma();
  res.json(desempenho);
});
