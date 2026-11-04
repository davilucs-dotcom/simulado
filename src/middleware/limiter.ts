import rateLimit from 'express-rate-limit';

export const iaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limite de 10 explicações por IP/token a cada 15 min
  message: { error: 'Limite de explicações atingido. Tente novamente em 15 minutos.' }
});
