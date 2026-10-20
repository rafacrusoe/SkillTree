import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL não foi definida. Configure-a no arquivo .env.');
}

const connectionUrl = new URL(databaseUrl);
connectionUrl.searchParams.set('sslmode', 'verify-full');

const pool = new Pool({ connectionString: connectionUrl.toString() });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const validIcons = new Set(['Code', 'Server', 'Database', 'Cpu', 'Terminal', 'Wrench', 'Shield']);

const fullStackIotTemplate = [
  { name: 'Fundamentos de Programação', description: 'Variáveis, condicionais, laços, funções e resolução de problemas.', iconName: 'Code', prerequisites: [] },
  { name: 'Git e GitHub', description: 'Versionamento, branches, commits, pull requests e colaboração.', iconName: 'Terminal', prerequisites: [] },
  { name: 'Terminal e Linux', description: 'Navegação, permissões, processos e comandos essenciais.', iconName: 'Terminal', prerequisites: [] },
  { name: 'HTML e CSS', description: 'Estrutura semântica, layout responsivo e acessibilidade.', iconName: 'Code', prerequisites: [] },
  { name: 'JavaScript', description: 'Linguagem da web: DOM, módulos, assincronismo e consumo de APIs.', iconName: 'Code', prerequisites: ['Fundamentos de Programação'] },
  { name: 'TypeScript', description: 'Tipos, interfaces e código JavaScript mais seguro.', iconName: 'Code', prerequisites: ['JavaScript'] },
  { name: 'React', description: 'Componentes, estado, hooks, rotas e construção de interfaces.', iconName: 'Code', prerequisites: ['TypeScript', 'HTML e CSS'] },
  { name: 'Node.js', description: 'JavaScript no servidor, módulos, eventos e ambiente de execução.', iconName: 'Server', prerequisites: ['JavaScript'] },
  { name: 'APIs REST', description: 'Rotas, HTTP, validação, erros e contratos de API.', iconName: 'Server', prerequisites: ['Node.js'] },
  { name: 'SQL e Modelagem de Dados', description: 'Consultas, relações, índices e desenho de bancos relacionais.', iconName: 'Database', prerequisites: ['Fundamentos de Programação'] },
  { name: 'PostgreSQL', description: 'Banco relacional para aplicações reais.', iconName: 'Database', prerequisites: ['SQL e Modelagem de Dados'] },
  { name: 'Prisma ORM', description: 'Schema, migrations, consultas tipadas e integração com PostgreSQL.', iconName: 'Database', prerequisites: ['Node.js', 'PostgreSQL'] },
  { name: 'Autenticação e Autorização', description: 'Sessões, JWT, senhas seguras e permissões.', iconName: 'Lock', prerequisites: ['APIs REST', 'Prisma ORM'] },
  { name: 'Testes Automatizados', description: 'Testes unitários, integração e garantia de qualidade.', iconName: 'Code', prerequisites: ['Node.js'] },
  { name: 'Docker', description: 'Containers, imagens e ambientes de desenvolvimento reproduzíveis.', iconName: 'Wrench', prerequisites: ['Terminal e Linux', 'Node.js'] },
  { name: 'CI/CD', description: 'Pipelines de teste, build e entrega contínua.', iconName: 'Wrench', prerequisites: ['Docker', 'Git e GitHub'] },
  { name: 'Deploy e Observabilidade', description: 'Publicação, logs, métricas e monitoramento da aplicação.', iconName: 'Wrench', prerequisites: ['CI/CD', 'APIs REST'] },
  { name: 'Eletrônica Básica', description: 'Tensão, corrente, componentes e leitura de esquemas simples.', iconName: 'Cpu', prerequisites: [] },
  { name: 'C/C++ para Microcontroladores', description: 'Fundamentos da linguagem aplicados a sistemas embarcados.', iconName: 'Cpu', prerequisites: ['Fundamentos de Programação'] },
  { name: 'ESP32', description: 'GPIO, Wi‑Fi, sensores e projetos embarcados.', iconName: 'Cpu', prerequisites: ['Eletrônica Básica', 'C/C++ para Microcontroladores'] },
  { name: 'PlatformIO', description: 'Ambiente de desenvolvimento, bibliotecas e build para ESP32.', iconName: 'Cpu', prerequisites: ['ESP32'] },
  { name: 'MQTT', description: 'Protocolo leve de mensageria para dispositivos IoT.', iconName: 'Server', prerequisites: ['ESP32'] },
  { name: 'IoT integrado à API', description: 'Conecta dispositivos, MQTT, APIs e persistência de dados.', iconName: 'Cpu', prerequisites: ['MQTT', 'APIs REST', 'PostgreSQL'] },
] as const;

const professionalRoadmapTemplate = [
  { name: 'Lógica de Programação', description: 'O ponto de partida: algoritmos, decomposição de problemas, funções e estruturas de controle.', iconName: 'Code', prerequisites: [] },
  { name: 'Git e GitHub', description: 'Versionamento, branches, pull requests e colaboração profissional.', iconName: 'Terminal', prerequisites: ['Lógica de Programação'] },
  { name: 'Terminal e Linux', description: 'Shell, sistema de arquivos, permissões, processos e scripts.', iconName: 'Terminal', prerequisites: ['Lógica de Programação'] },
  { name: 'HTML e CSS', description: 'Web semântica, acessibilidade, responsividade e design de interfaces.', iconName: 'Code', prerequisites: ['Lógica de Programação'] },
  { name: 'JavaScript', description: 'DOM, módulos, assincronismo, eventos e consumo de APIs.', iconName: 'Code', prerequisites: ['Lógica de Programação'] },
  { name: 'TypeScript', description: 'Tipos, interfaces e modelagem segura de aplicações JavaScript.', iconName: 'Code', prerequisites: ['JavaScript'] },
  { name: 'React', description: 'Componentes, hooks, estado, formulários e experiências interativas.', iconName: 'Code', prerequisites: ['TypeScript', 'HTML e CSS'] },
  { name: 'Next.js', description: 'Aplicações full stack React, renderização, rotas e performance.', iconName: 'Code', prerequisites: ['React'] },
  { name: 'Node.js', description: 'JavaScript no servidor, módulos, eventos e serviços web.', iconName: 'Server', prerequisites: ['JavaScript'] },
  { name: 'APIs REST', description: 'HTTP, rotas, validação, erros, documentação e contratos de API.', iconName: 'Server', prerequisites: ['Node.js'] },
  { name: 'SQL e Modelagem de Dados', description: 'Consultas, relações, índices e desenho de dados relacionais.', iconName: 'Database', prerequisites: ['Lógica de Programação'] },
  { name: 'PostgreSQL', description: 'Banco de dados relacional para aplicações de produção.', iconName: 'Database', prerequisites: ['SQL e Modelagem de Dados'] },
  { name: 'Prisma ORM', description: 'Schema, migrations e acesso tipado ao PostgreSQL.', iconName: 'Database', prerequisites: ['PostgreSQL', 'Node.js'] },
  { name: 'Segurança de Aplicações', description: 'OWASP, autenticação, autorização, segredos e proteção de APIs.', iconName: 'Shield', prerequisites: ['APIs REST', 'Prisma ORM'] },
  { name: 'Testes Automatizados', description: 'Testes unitários, integração, e2e e qualidade contínua.', iconName: 'Code', prerequisites: ['Node.js'] },
  { name: 'Docker', description: 'Containers e ambientes reproduzíveis para desenvolvimento e produção.', iconName: 'Wrench', prerequisites: ['Terminal e Linux', 'Node.js'] },
  { name: 'CI/CD e Relatórios', description: 'Pipelines que executam testes, entregam software e publicam resultados.', iconName: 'Wrench', prerequisites: ['Docker', 'Git e GitHub'] },
  { name: 'Cloud e Deploy', description: 'Publicação, variáveis de ambiente, domínios e operação na nuvem.', iconName: 'Cloud', prerequisites: ['CI/CD e Relatórios', 'Next.js'] },
  { name: 'OpenTelemetry e Observabilidade', description: 'Logs, métricas, traces e diagnóstico de sistemas em produção.', iconName: 'Wrench', prerequisites: ['Cloud e Deploy', 'APIs REST'] },
  { name: 'Kubernetes', description: 'Orquestração de containers e fundamentos cloud native.', iconName: 'Wrench', prerequisites: ['Docker', 'Cloud e Deploy'] },
  { name: 'Python', description: 'Automação, dados, scripts e base para aplicações de IA.', iconName: 'Code', prerequisites: ['Lógica de Programação'] },
  { name: 'Fundamentos de IA Generativa', description: 'LLMs, prompts, embeddings, avaliação e uso responsável de IA.', iconName: 'Brain', prerequisites: ['Python'] },
  { name: 'Agentes e Responses API', description: 'Ferramentas, RAG, guardrails e aplicações agentic de IA.', iconName: 'Brain', prerequisites: ['Fundamentos de IA Generativa', 'APIs REST'] },
  { name: 'Eletrônica Básica', description: 'Tensão, corrente, componentes, sensores e leitura de esquemas.', iconName: 'Cpu', prerequisites: ['Lógica de Programação'] },
  { name: 'C/C++ para Microcontroladores', description: 'Programação embarcada eficiente para dispositivos e sensores.', iconName: 'Cpu', prerequisites: ['Eletrônica Básica', 'Lógica de Programação'] },
  { name: 'ESP32', description: 'GPIO, Wi-Fi, sensores e projetos de Internet das Coisas.', iconName: 'Cpu', prerequisites: ['C/C++ para Microcontroladores'] },
  { name: 'MQTT', description: 'Mensageria leve para comunicação entre dispositivos IoT.', iconName: 'Server', prerequisites: ['ESP32'] },
  { name: 'IoT Integrado à Nuvem', description: 'Dispositivos, APIs, mensageria e dados em uma solução completa.', iconName: 'Cpu', prerequisites: ['MQTT', 'APIs REST', 'PostgreSQL'] },
] as const;

const legacySkillNames = [
  'Backend Node.js',
  'Microcontrolador ESP32',
  'Fundamentos de Programação',
  'React',
  'Autenticação e Autorização',
  'Deploy e Observabilidade',
  'IoT integrado à API',
];

const qaAutomationTemplate = [
  { name: 'Robot Framework', description: 'Automação de testes com keywords reutilizáveis e suites legíveis.', iconName: 'Wrench', prerequisites: ['Lógica de Programação'] },
  { name: 'Playwright', description: 'Testes end-to-end modernos para portais web.', iconName: 'Code', prerequisites: ['Robot Framework'] },
  { name: 'Android + Appium', description: 'Automação de apps Android e validação em dispositivos.', iconName: 'Cpu', prerequisites: ['Robot Framework'] },
  { name: 'Testes de API', description: 'Validação de contratos, integrações e regras de negócio via API.', iconName: 'Server', prerequisites: ['APIs REST'] },
  { name: 'n8n', description: 'Automação de fluxos, integrações, webhooks e rotinas de QA.', iconName: 'Wrench', prerequisites: ['APIs REST'] },
] as const;

// Uma trilha segura e introdutória: conceitos que ajudam a entender e testar
// sistemas, sempre em ambientes autorizados e sem partir para exploração.
const cybersecurityTemplate = [
  { name: 'Fundamentos de Cibersegurança', description: 'Princípios de confidencialidade, integridade, disponibilidade, ameaças e boas práticas digitais.', iconName: 'Shield', prerequisites: ['Lógica de Programação'] },
  { name: 'Redes e Protocolos', description: 'Como TCP/IP, DNS, HTTP e HTTPS conectam aplicações e onde surgem riscos comuns.', iconName: 'Shield', prerequisites: ['Terminal e Linux'] },
  { name: 'Segurança no Linux', description: 'Permissões, usuários, atualizações, serviços e configuração segura do sistema.', iconName: 'Shield', prerequisites: ['Fundamentos de Cibersegurança', 'Terminal e Linux'] },
  { name: 'Segurança Web e OWASP', description: 'Vulnerabilidades web frequentes, validação de entradas, sessões e o OWASP Top 10.', iconName: 'Shield', prerequisites: ['Fundamentos de Cibersegurança', 'APIs REST'] },
  { name: 'Segurança de APIs', description: 'Autenticação, autorização, rate limiting, validação e proteção de dados em APIs.', iconName: 'Shield', prerequisites: ['Segurança Web e OWASP', 'APIs REST'] },
  { name: 'QA de Segurança', description: 'Checks de segurança em testes, dados sensíveis, relatórios responsáveis e validação em ambientes autorizados.', iconName: 'Shield', prerequisites: ['Segurança Web e OWASP', 'Playwright'] },
] as const;

app.use(cors());
app.use(express.json());

async function normalizeRoadmapNames() {
  // Keep existing progress and prerequisite IDs intact while cleaning up the
  // versioned labels previously shown in the professional roadmap.
  await prisma.skill.updateMany({ where: { name: 'React 19', isArchived: false }, data: { name: 'React' } });
  await prisma.skill.updateMany({ where: { name: 'Next.js 16', isArchived: false }, data: { name: 'Next.js' } });
  await prisma.skill.updateMany({ where: { name: 'CI/CD', isArchived: false }, data: { name: 'CI/CD e Relatórios' } });
}

async function syncQaAutomationSkills() {
  const skillsByName = new Map((await prisma.skill.findMany({ where: { isArchived: false } })).map((skill) => [skill.name, skill]));

  for (const templateSkill of qaAutomationTemplate) {
    if (skillsByName.has(templateSkill.name)) continue;
    const skill = await prisma.skill.create({
      data: { name: templateSkill.name, description: templateSkill.description, iconName: templateSkill.iconName, positionX: 0, positionY: 0 },
    });
    skillsByName.set(templateSkill.name, skill);
  }

  for (const templateSkill of qaAutomationTemplate) {
    const target = skillsByName.get(templateSkill.name);
    if (!target) continue;
    for (const prerequisiteName of templateSkill.prerequisites) {
      const source = skillsByName.get(prerequisiteName);
      if (!source) continue;
      const existingRequirement = await prisma.skillRequirement.findFirst({ where: { sourceId: source.id, targetId: target.id } });
      if (!existingRequirement) await prisma.skillRequirement.create({ data: { sourceId: source.id, targetId: target.id } });
    }
  }
}

async function syncCybersecuritySkills() {
  const skillsByName = new Map((await prisma.skill.findMany({ where: { isArchived: false } })).map((skill) => [skill.name, skill]));

  for (const templateSkill of cybersecurityTemplate) {
    if (skillsByName.has(templateSkill.name)) continue;
    const skill = await prisma.skill.create({
      data: { name: templateSkill.name, description: templateSkill.description, iconName: templateSkill.iconName, positionX: 0, positionY: 0 },
    });
    skillsByName.set(templateSkill.name, skill);
  }

  for (const templateSkill of cybersecurityTemplate) {
    const target = skillsByName.get(templateSkill.name);
    if (!target) continue;
    for (const prerequisiteName of templateSkill.prerequisites) {
      const source = skillsByName.get(prerequisiteName);
      if (!source) continue;
      const existingRequirement = await prisma.skillRequirement.findFirst({ where: { sourceId: source.id, targetId: target.id } });
      if (!existingRequirement) await prisma.skillRequirement.create({ data: { sourceId: source.id, targetId: target.id } });
    }
  }
}

async function getOrCreatePlayer() {
  const existingPlayer = await prisma.user.findFirst();
  if (existingPlayer) return existingPlayer;

  return prisma.user.create({ data: { name: 'Aventureiro da SkillTree' } });
}

async function getPlayerSkills() {
  const player = await getOrCreatePlayer();
  const [skills, requirements, progress] = await Promise.all([
    prisma.skill.findMany({ where: { isArchived: false }, orderBy: { name: 'asc' } }),
    prisma.skillRequirement.findMany({ where: { source: { isArchived: false }, target: { isArchived: false } } }),
    prisma.userSkill.findMany({ where: { userId: player.id } }),
  ]);

  const progressBySkill = new Map(progress.map((item) => [item.skillId, item.status]));
  const requirementsByTarget = new Map<string, string[]>();

  for (const requirement of requirements) {
    const sources = requirementsByTarget.get(requirement.targetId) ?? [];
    sources.push(requirement.sourceId);
    requirementsByTarget.set(requirement.targetId, sources);
  }

  return skills.map((skill) => {
    const savedStatus = progressBySkill.get(skill.id);
    const prerequisiteIds = requirementsByTarget.get(skill.id) ?? [];
    const prerequisitesComplete = prerequisiteIds.every(
      (id) => progressBySkill.get(id) === 'COMPLETED',
    );

    return {
      ...skill,
      status: savedStatus === 'COMPLETED'
        ? 'COMPLETED'
        : prerequisitesComplete
          ? 'UNLOCKED'
          : 'LOCKED',
    };
  });
}

app.get('/', (_req, res) => {
  res.json({ message: 'Motor da SkillTree ligado e rodando! ⚔️' });
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Erro de conexão com o banco:', error);
    res.status(503).json({ status: 'unavailable', error: 'Banco de dados indisponível.' });
  }
});

app.get('/player-skills', async (_req, res) => {
  try {
    res.json(await getPlayerSkills());
  } catch (error) {
    console.error('Erro em /player-skills:', error);
    res.status(503).json({ error: 'Não foi possível carregar sua árvore agora.' });
  }
});

app.get('/edges', async (_req, res) => {
  try {
    res.json(await prisma.skillRequirement.findMany({ where: { source: { isArchived: false }, target: { isArchived: false } } }));
  } catch (error) {
    console.error('Erro em /edges:', error);
    res.status(503).json({ error: 'Não foi possível carregar as conexões da árvore.' });
  }
});

app.post('/skills', async (req, res) => {
  try {
    const { name, description, iconName = 'Code', parentId } = req.body;
    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (!normalizedName) {
      return res.status(400).json({ error: 'Informe um nome para a habilidade.' });
    }
    if (!validIcons.has(iconName)) {
      return res.status(400).json({ error: 'Ícone de habilidade inválido.' });
    }

    if (parentId) {
      const parent = await prisma.skill.findFirst({ where: { id: parentId, isArchived: false } });
      if (!parent) return res.status(404).json({ error: 'Habilidade pré-requisito não encontrada.' });
    }

    // O layout é calculado pelo frontend a partir das dependências.
    // Estes campos preservam a compatibilidade com o schema existente.
    const newSkill = await prisma.$transaction(async (tx) => {
      const skill = await tx.skill.create({
        data: {
          name: normalizedName,
          description: typeof description === 'string' ? description.trim() : null,
          iconName,
          positionX: 0,
          positionY: 0,
        },
      });

      if (parentId) {
        await tx.skillRequirement.create({ data: { sourceId: parentId, targetId: skill.id } });
      }

      return skill;
    });

    res.status(201).json({ message: 'Habilidade criada com sucesso!', skill: newSkill });
  } catch (error) {
    console.error('Erro no POST /skills:', error);
    res.status(500).json({ error: 'Não foi possível criar a habilidade.' });
  }
});

app.patch('/skills/:skillId/complete', async (req, res) => {
  try {
    const { skillId } = req.params;
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) return res.status(404).json({ error: 'Habilidade não encontrada.' });

    const player = await getOrCreatePlayer();
    const requirements = await prisma.skillRequirement.findMany({
      where: { targetId: skillId, source: { isArchived: false }, target: { isArchived: false } },
    });
    const prerequisiteProgress = await prisma.userSkill.findMany({
      where: { userId: player.id, skillId: { in: requirements.map((item) => item.sourceId) } },
    });
    const completedIds = new Set(
      prerequisiteProgress
        .filter((item) => item.status === 'COMPLETED')
        .map((item) => item.skillId),
    );

    if (requirements.some((item) => !completedIds.has(item.sourceId))) {
      return res.status(409).json({ error: 'Conclua todos os pré-requisitos antes desta habilidade.' });
    }

    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: player.id, skillId } },
      update: { status: 'COMPLETED' },
      create: { userId: player.id, skillId, status: 'COMPLETED' },
    });

    res.json({ message: 'Habilidade concluída!', skills: await getPlayerSkills() });
  } catch (error) {
    console.error('Erro ao concluir habilidade:', error);
    res.status(500).json({ error: 'Não foi possível atualizar o progresso.' });
  }
});

app.post('/progress/reset', async (_req, res) => {
  try {
    const player = await getOrCreatePlayer();
    await prisma.userSkill.deleteMany({ where: { userId: player.id } });

    res.json({ message: 'Progresso da árvore redefinido.', skills: await getPlayerSkills() });
  } catch (error) {
    console.error('Erro ao redefinir o progresso:', error);
    res.status(500).json({ error: 'Não foi possível redefinir o progresso da árvore.' });
  }
});

app.post('/templates/full-stack-iot', async (_req, res) => {
  try {
    // Neon pode recusar transações interativas mais longas em conexões pooladas.
    // Cada operação é idempotente, então também é seguro repetir esta rota caso ela seja interrompida.
    const skillsByName = new Map<string, { id: string }>();
    let createdSkills = 0;
    let createdRequirements = 0;

    for (const templateSkill of fullStackIotTemplate) {
      const existing = await prisma.skill.findFirst({ where: { name: templateSkill.name } });
      const skill = existing ?? await prisma.skill.create({
        data: {
          name: templateSkill.name,
          description: templateSkill.description,
          iconName: templateSkill.iconName,
          positionX: 0,
          positionY: 0,
        },
      });
      if (!existing) createdSkills += 1;
      skillsByName.set(templateSkill.name, skill);
    }

    for (const templateSkill of fullStackIotTemplate) {
      const target = skillsByName.get(templateSkill.name);
      if (!target) continue;
      for (const prerequisiteName of templateSkill.prerequisites) {
        const source = skillsByName.get(prerequisiteName);
        if (!source) continue;
        const existingRequirement = await prisma.skillRequirement.findFirst({
          where: { sourceId: source.id, targetId: target.id },
        });
        if (!existingRequirement) {
          await prisma.skillRequirement.create({ data: { sourceId: source.id, targetId: target.id } });
          createdRequirements += 1;
        }
      }
    }

    res.status(201).json({
      createdSkills,
      createdRequirements,
      message: 'Template Full Stack + IoT instalado com sucesso!',
      skills: await getPlayerSkills(),
    });
  } catch (error) {
    console.error('Erro ao instalar template:', error);
    res.status(500).json({ error: 'Não foi possível instalar o template da árvore.' });
  }
});

app.post('/templates/professional-roadmap', async (_req, res) => {
  try {
    await prisma.skill.updateMany({
      where: { name: { in: legacySkillNames }, isArchived: false },
      data: { isArchived: true },
    });

    const skillsByName = new Map<string, { id: string }>();
    let createdSkills = 0;
    let createdRequirements = 0;

    for (const templateSkill of professionalRoadmapTemplate) {
      const existing = await prisma.skill.findFirst({
        where: { name: templateSkill.name, isArchived: false },
      });
      const skill = existing ?? await prisma.skill.create({
        data: {
          name: templateSkill.name,
          description: templateSkill.description,
          iconName: templateSkill.iconName,
          positionX: 0,
          positionY: 0,
        },
      });
      if (!existing) createdSkills += 1;
      skillsByName.set(templateSkill.name, skill);
    }

    for (const templateSkill of professionalRoadmapTemplate) {
      const target = skillsByName.get(templateSkill.name);
      if (!target) continue;
      for (const prerequisiteName of templateSkill.prerequisites) {
        const source = skillsByName.get(prerequisiteName);
        if (!source) continue;
        const existingRequirement = await prisma.skillRequirement.findFirst({
          where: { sourceId: source.id, targetId: target.id },
        });
        if (!existingRequirement) {
          await prisma.skillRequirement.create({ data: { sourceId: source.id, targetId: target.id } });
          createdRequirements += 1;
        }
      }
    }

    res.status(201).json({
      message: 'Roadmap profissional instalado com sucesso!',
      createdSkills,
      createdRequirements,
      skills: await getPlayerSkills(),
    });
  } catch (error) {
    console.error('Erro ao instalar roadmap profissional:', error);
    res.status(500).json({ error: 'Não foi possível instalar o roadmap profissional.' });
  }
});

async function startServer() {
  try {
    await normalizeRoadmapNames();
    await syncQaAutomationSkills();
    await syncCybersecuritySkills();
  } catch (error) {
    console.error('Não foi possível normalizar os nomes do roadmap:', error);
  }

  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

void startServer();
