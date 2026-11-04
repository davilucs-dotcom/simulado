
import 'dotenv/config';
import { PrismaClient, Dificuldade } from '@prisma/client';

const prisma = new PrismaClient();
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

async function main() {
  const disciplina = await prisma.disciplina.upsert({
    where: { nome: 'ENADE 2026 - Ciência da Computação' },
    update: {},
    create: { nome: 'ENADE 2026 - Ciência da Computação' },
  });

  const eixos = [
    { nome: 'Fundamentos da Computação' },
    { nome: 'Engenharia de Software' },
    { nome: 'Arquitetura e Redes' },
    { nome: 'Bancos de Dados' },
    { nome: 'Teoria da Computação' },
    { nome: 'Sistemas Operacionais' },
    { nome: 'Inteligência Artificial' },
  ];

  for (const eixo of eixos) {
    await prisma.topico.upsert({
      where: { disciplinaId_nome: { disciplinaId: disciplina.id, nome: eixo.nome } },
      update: {},
      create: { disciplinaId: disciplina.id, nome: eixo.nome },
    });
  }

  const questoesEnade = [
    {
      topico: 'Fundamentos da Computação',
      enunciado: 'Ao analisar um algoritmo de ordenação, observou-se que seu tempo de execução no pior caso é O(n log n). Qual das seguintes estruturas de ordenação se encaixa nessa descrição?',
      alternativas: ['Bubble Sort', 'Insertion Sort', 'Quick Sort (média)', 'Merge Sort', 'Selection Sort'],
      correta: 'Merge Sort',
      justificativa: 'O Merge Sort possui complexidade O(n log n) em todos os casos (melhor, médio e pior).',
      prioridade: 5,
      edicao: '2021'
    },
    {
      topico: 'Teoria da Computação',
      enunciado: 'Sobre a hierarquia de Chomsky, qual tipo de gramática gera linguagens que podem ser reconhecidas por um Autômato de Pilha (Pushdown Automaton)?',
      alternativas: ['Gramáticas Regulares (Tipo 3)', 'Gramáticas Livres de Contexto (Tipo 2)', 'Gramáticas Sensíveis ao Contexto (Tipo 1)', 'Gramáticas Irrestritas (Tipo 0)', 'Gramáticas Lineares'],
      correta: 'Gramáticas Livres de Contexto (Tipo 2)',
      justificativa: 'Linguagens livres de contexto são precisamente aquelas aceitas por autômatos de pilha não-determinísticos.',
      prioridade: 4,
      edicao: '2017'
    },
    {
      topico: 'Sistemas Operacionais',
      enunciado: 'No gerenciamento de memória, o fenômeno de "Thrashing" ocorre quando:',
      alternativas: [
        'O processador gasta mais tempo realizando trocas de páginas do que executando processos.',
        'A memória RAM está completamente vazia.',
        'O algoritmo de escalonamento escolhe sempre o processo mais curto.',
        'A fragmentação externa impede a alocação de grandes blocos.',
        'Ocorre um deadlock entre threads.'
      ],
      correta: 'O processador gasta mais tempo realizando trocas de páginas do que executando processos.',
      justificativa: 'Thrashing é a hiperatividade de paginação causada por falta de memória física para o conjunto de trabalho dos processos.',
      prioridade: 5,
      edicao: '2014'
    },
    {
      topico: 'Engenharia de Software',
      enunciado: 'No contexto de Metodologias Ágeis, qual artefato é tipicamente utilizado para descrever as necessidades do cliente sob a perspectiva do usuário final?',
      alternativas: ['Diagrama de Classes', 'Histórias de Usuário', 'Matriz de Rastreabilidade', 'Dicionário de Dados', 'Gráfico de Gantt'],
      correta: 'Histórias de Usuário',
      justificativa: 'Histórias de usuário são a forma padrão de capturar requisitos funcionais de forma ágil.',
      prioridade: 5,
      edicao: '2023'
    },
    {
      topico: 'Arquitetura e Redes',
      enunciado: 'Em relação ao modelo OSI, em qual camada atuam os protocolos TCP e UDP?',
      alternativas: ['Aplicação', 'Apresentação', 'Sessão', 'Transporte', 'Rede'],
      correta: 'Transporte',
      justificativa: 'TCP e UDP são protocolos fundamentais da camada de transporte do modelo OSI.',
      prioridade: 5,
      edicao: '2021'
    },
    {
      topico: 'Bancos de Dados',
      enunciado: 'Qual das alternativas abaixo define corretamente o conceito de Atomicidade em uma transação ACID?',
      alternativas: [
        'A transação deve levar o banco de um estado consistente para outro.',
        'As alterações só são visíveis após a conclusão.',
        'Ou todas as operações da transação são realizadas, ou nenhuma é.',
        'A transação é isolada de outras transações simultâneas.',
        'O banco garante que os dados nunca serão perdidos.'
      ],
      correta: 'Ou todas as operações da transação são realizadas, ou nenhuma é.',
      justificativa: 'Atomicidade garante que a unidade de trabalho seja indivisível.',
      prioridade: 5,
      edicao: '2017'
    },
    {
      topico: 'Inteligência Artificial',
      enunciado: 'Sobre Redes Neurais Artificiais, a técnica de "Backpropagation" é utilizada primordialmente para:',
      alternativas: [
        'Definir a arquitetura da rede.',
        'Inicializar os pesos aleatoriamente.',
        'Ajustar os pesos da rede com base no erro calculado na saída.',
        'Reduzir a dimensão dos dados de entrada.',
        'Aumentar a velocidade de execução do hardware.'
      ],
      correta: 'Ajustar os pesos da rede com base no erro calculado na saída.',
      justificativa: 'Backpropagation é o algoritmo clássico de treinamento supervisionado para propagar o erro de volta e ajustar pesos.',
      prioridade: 4,
      edicao: '2023'
    }
  ];

  for (const q of questoesEnade) {
    const topico = await prisma.topico.findUnique({
      where: { disciplinaId_nome: { disciplinaId: disciplina.id, nome: q.topico } }
    });

    if (!topico) continue;

    const idx = q.alternativas.indexOf(q.correta);

    let questao = await prisma.questao.findFirst({
      where: { enunciado: q.enunciado }
    });

    if (!questao) {
      await prisma.questao.create({
        data: {
          enunciado: q.enunciado,
          dificuldade: Dificuldade.MEDIA,
          prioridade: q.prioridade,
          edicaoEnade: q.edicao,
          topicoId: topico.id,
          alternativas: { create: q.alternativas.map((texto, i) => ({ letra: LETRAS[i], texto })) },
          gabarito: { create: { alternativaCorreta: LETRAS[idx], justificativa: q.justificativa } },
        },
      });
    }
  }

  console.log('Seed ENADE concluído com sucesso!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());