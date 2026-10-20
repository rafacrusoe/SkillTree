import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, BaseEdge, Controls, getBezierPath, Handle, MarkerType, MiniMap, Panel, Position } from 'reactflow';
import type { Edge, EdgeProps, Node } from 'reactflow';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';
import 'reactflow/dist/style.css';
import { BrainCircuit, CheckCircle2, ChevronLeft, ChevronRight, Cloud, Code2, Cpu, Database, GitBranch, Lock, Map as MapIcon, PanelLeftClose, PanelRightClose, RotateCcw, Server, Settings2, ShieldCheck, Sparkles, Terminal, Wrench } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const ICONS = { Server, Cpu, Code: Code2, Database, Terminal, Wrench, Brain: BrainCircuit, Cloud, Shield: ShieldCheck, Lock };
const UNLOCK_ANIMATION_MS = 4400;

type SkillStatus = 'LOCKED' | 'UNLOCKED' | 'COMPLETED';
type Skill = { id: string; name: string; description: string | null; iconName: keyof typeof ICONS; status: SkillStatus };
type Requirement = { id: string; sourceId: string; targetId: string };
type SkillNodeData = Skill & { depth: number; missingPrerequisites: string[]; onComplete: (id: string) => void; isCompleting: boolean; justUnlocked: boolean };
type ProgressEdgeData = { celebrate?: boolean };

const canonicalSkillNames: Record<string, string> = {
  'React 19': 'React',
  'Next.js 16': 'Next.js',
};

const cybersecuritySkills = new Set([
  'Fundamentos de Cibersegurança',
  'Redes e Protocolos',
  'Segurança no Linux',
  'Segurança Web e OWASP',
  'Segurança de APIs',
  'QA de Segurança',
  'Segurança de Aplicações',
]);

const badgeCategoryOverrides: Record<string, string> = {
  'Lógica de Programação': 'BASE',
  'Fundamentos de Programação': 'BASE',
  'Git e GitHub': 'FERRAMENTAS',
  'Terminal e Linux': 'FERRAMENTAS',
  'HTML e CSS': 'WEB',
  JavaScript: 'WEB',
  TypeScript: 'WEB',
  React: 'WEB',
  'Next.js': 'WEB',
  'Robot Framework': 'QA',
  Playwright: 'QA',
  'Testes Automatizados': 'QA',
  'Testes de API': 'QA',
  n8n: 'AUTOMAÇÃO',
  'Android + Appium': 'MOBILE',
  'Eletrônica Básica': 'IOT',
  'C/C++ para Microcontroladores': 'IOT',
  ESP32: 'IOT',
  PlatformIO: 'IOT',
  MQTT: 'IOT',
  'IoT Integrado à Nuvem': 'IOT',
  'IoT integrado à API': 'IOT',
};

const categoryByIcon: Record<keyof typeof ICONS, string> = {
  Code: 'DEV',
  Server: 'BACKEND',
  Database: 'DADOS',
  Cpu: 'SISTEMAS',
  Terminal: 'FERRAMENTAS',
  Wrench: 'DEVOPS',
  Brain: 'IA',
  Cloud: 'CLOUD',
  Shield: 'CYBER',
  Lock: 'SEGURANÇA',
};

function getBadgeCategory(skill: Skill) {
  if (cybersecuritySkills.has(skill.name)) return 'CYBER';
  return badgeCategoryOverrides[skill.name] ?? categoryByIcon[skill.iconName] ?? 'TECH';
}

function normalizeSkillNames(nextSkills: Skill[]): Skill[] {
  return nextSkills.map((skill) => ({ ...skill, name: canonicalSkillNames[skill.name] ?? skill.name }));
}

const particleOptions: ISourceOptions = {
  fullScreen: { enable: false, zIndex: 0 },
  fpsLimit: 60,
  interactivity: {
    events: { onHover: { enable: true, mode: 'grab' }, resize: { enable: true } },
    modes: { grab: { distance: 130, links: { opacity: 0.16 } } },
  },
  particles: {
    color: { value: ['#34d399', '#38bdf8', '#64748b'] },
    links: { color: '#34d399', distance: 150, enable: true, opacity: 0.15, width: 1 },
    move: { direction: 'none', enable: true, outModes: { default: 'out' }, speed: 0.48, straight: false },
    number: { density: { enable: true }, value: 96 },
    opacity: { value: { min: 0.1, max: 0.45 } },
    shape: { type: 'circle' },
    size: { value: { min: 1, max: 3 } },
  },
};

function ParticleBackground() {
  return <ParticlesProvider init={loadSlim}>
    <Particles id="skilltree-particles" options={particleOptions} />
  </ParticlesProvider>;
}

function layoutSkills(skills: Skill[], requirements: Requirement[]): Node<SkillNodeData>[] {
  const children = new Map<string, string[]>();
  const incoming = new Map<string, number>(skills.map((skill) => [skill.id, 0]));

  for (const { sourceId, targetId } of requirements) {
    if (!incoming.has(sourceId) || !incoming.has(targetId)) continue;
    children.set(sourceId, [...(children.get(sourceId) ?? []), targetId]);
    incoming.set(targetId, (incoming.get(targetId) ?? 0) + 1);
  }

  const depthById = new Map<string, number>();
  const queue = skills.filter((skill) => incoming.get(skill.id) === 0).map((skill) => skill.id);
  for (const id of queue) depthById.set(id, 0);

  for (let index = 0; index < queue.length; index += 1) {
    const currentId = queue[index];
    const currentDepth = depthById.get(currentId) ?? 0;
    for (const childId of children.get(currentId) ?? []) {
      incoming.set(childId, (incoming.get(childId) ?? 1) - 1);
      depthById.set(childId, Math.max(depthById.get(childId) ?? 0, currentDepth + 1));
      if (incoming.get(childId) === 0) queue.push(childId);
    }
  }

  const fallbackDepth = Math.max(0, ...depthById.values()) + 1;
  for (const skill of skills) if (!depthById.has(skill.id)) depthById.set(skill.id, fallbackDepth);

  const levels = new Map<number, Skill[]>();
  for (const skill of skills) {
    const depth = depthById.get(skill.id) ?? 0;
    levels.set(depth, [...(levels.get(depth) ?? []), skill]);
  }

  const positionsById = new Map<string, number>();
  return [...levels.entries()].sort(([firstDepth], [secondDepth]) => firstDepth - secondDepth).flatMap(([depth, levelSkills]) => {
    const sorted = [...levelSkills].sort((firstSkill, secondSkill) => {
      const averageParentPosition = (skill: Skill) => {
        const parentPositions = requirements
          .filter((requirement) => requirement.targetId === skill.id)
          .map((requirement) => positionsById.get(requirement.sourceId))
          .filter((position): position is number => position !== undefined);
        return parentPositions.length ? parentPositions.reduce((total, position) => total + position, 0) / parentPositions.length : Number.MAX_SAFE_INTEGER;
      };
      const positionDifference = averageParentPosition(firstSkill) - averageParentPosition(secondSkill);
      return positionDifference || firstSkill.name.localeCompare(secondSkill.name);
    });
    const verticalSpacing = 170;
    const offset = ((sorted.length - 1) * verticalSpacing) / 2;
    return sorted.map((skill, index) => {
      // A left-to-right lattice keeps the learning sequence legible while the
      // parent-aware ordering brings related prerequisites close together.
      const verticalPosition = index * verticalSpacing - offset;
      positionsById.set(skill.id, verticalPosition);
      return {
        id: skill.id,
        type: 'skill',
        position: { x: depth * 275, y: verticalPosition },
        data: { ...skill, depth, missingPrerequisites: [], onComplete: () => undefined, isCompleting: false, justUnlocked: false },
      };
    });
  });
}

function SkillNode({ data }: { data: SkillNodeData }) {
  const Icon = ICONS[data.iconName] ?? Lock;
  const isAvailable = data.status === 'UNLOCKED';
  const canComplete = isAvailable && !data.isCompleting;
  const statusText = data.isCompleting ? 'Concluindo…' : data.status === 'COMPLETED' ? 'Concluído' : isAvailable ? 'Disponível' : 'Bloqueado';
  const missingRequirements = data.status === 'LOCKED' ? data.missingPrerequisites : [];
  const category = getBadgeCategory(data);

  return (
    <div className={`skill-node ${data.status.toLowerCase()} ${data.isCompleting ? 'is-completing' : ''} ${data.justUnlocked ? 'just-unlocked' : ''} ${data.depth === 0 ? 'origin-node' : ''}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <button type="button" className="skill-core nodrag" disabled={!canComplete}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); if (canComplete) data.onComplete(data.id); }} aria-label={`${data.name}: ${statusText}`}>
        <span className="level-chip">{data.depth === 0 ? `${category} • INÍCIO` : `${category} • NÍVEL ${data.depth}`}</span>
        <span className="icon-shell">{data.status === 'COMPLETED' ? <CheckCircle2 size={25} /> : <Icon size={25} strokeWidth={1.8} />}</span>
        <span className="node-copy"><strong>{data.name}</strong><small>{statusText}</small></span>
      </button>
      <div className="node-tooltip nodrag nopan">
        <strong>{data.name}</strong>
        <p>{data.description || 'Sem descrição.'}</p>
        {missingRequirements.length > 0 ? <span className="tooltip-requirements">Faltam: {missingRequirements.join(' · ')}</span> : <span>{isAvailable ? 'Clique para concluir' : statusText}</span>}
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}

function ProgressEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }: EdgeProps<ProgressEdgeData>) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.2 });
  const trailRef = useRef<SVGPathElement>(null);
  const [trailLength, setTrailLength] = useState(0);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (!data?.celebrate) {
      setTrailLength(0);
      setAnimationProgress(0);
      return;
    }
    setTrailLength(trailRef.current?.getTotalLength() ?? 0);
  }, [data?.celebrate, edgePath]);

  useEffect(() => {
    if (!data?.celebrate || !trailLength) return;
    const startedAt = performance.now();
    let frameId = 0;
    const drawFrame = (now: number) => {
      const nextProgress = Math.min(1, (now - startedAt) / UNLOCK_ANIMATION_MS);
      setAnimationProgress(nextProgress);
      if (nextProgress < 1) frameId = requestAnimationFrame(drawFrame);
    };
    frameId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(frameId);
  }, [data?.celebrate, trailLength]);

  const orbPoint = useMemo(() => {
    if (!trailRef.current || !trailLength) return null;
    const point = trailRef.current.getPointAtLength(trailLength * animationProgress);
    return { x: point.x, y: point.y };
  }, [animationProgress, trailLength]);

  return <>
    <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
    {data?.celebrate && <>
      <path ref={trailRef} d={edgePath} className="progress-trail" style={{ strokeDasharray: trailLength || 1, strokeDashoffset: trailLength * (1 - animationProgress) || 1, opacity: trailLength ? 1 : 0 }} />
      {orbPoint && <g className="progress-orb">
        <circle className="progress-orb-aura" cx={orbPoint.x} cy={orbPoint.y} r="15" />
        <circle className="progress-orb-core" cx={orbPoint.x} cy={orbPoint.y} r="6" />
      </g>}
    </>}
  </>;
}

const nodeTypes = { skill: SkillNode };
const edgeTypes = { progress: ProgressEdge };
const inputStyle = { padding: '11px 12px', borderRadius: '9px', border: '1px solid #334155', backgroundColor: '#0b1220', color: 'white', outline: 'none' };

export default function App() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGuideMinimized, setIsGuideMinimized] = useState(false);
  const [isMiniMapMinimized, setIsMiniMapMinimized] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [completingSkillId, setCompletingSkillId] = useState<string | null>(null);
  const [pendingCompletionSkill, setPendingCompletionSkill] = useState<Skill | null>(null);
  const [celebratingEdges, setCelebratingEdges] = useState<string[]>([]);
  const [recentlyUnlockedIds, setRecentlyUnlockedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({ name: '', description: '', iconName: 'Code', parentId: '' });

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [skillsResponse, edgesResponse] = await Promise.all([fetch(`${API_URL}/player-skills`), fetch(`${API_URL}/edges`)]);
      if (!skillsResponse.ok || !edgesResponse.ok) throw new Error('A API não respondeu corretamente.');
      const [nextSkills, nextRequirements] = await Promise.all([skillsResponse.json(), edgesResponse.json()]);
      if (!Array.isArray(nextSkills) || !Array.isArray(nextRequirements)) throw new Error('A API retornou dados inválidos.');
      setSkills(normalizeSkillNames(nextSkills)); setRequirements(nextRequirements);
    } catch {
      setError('Não foi possível carregar a árvore. Verifique se o backend e o banco estão disponíveis.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const completeSkill = useCallback(async (skillId: string) => {
    if (completingSkillId) return;
    setError(null);
    const previousSkills = skills;
    const completedIds = new Set(skills.filter((skill) => skill.status === 'COMPLETED').map((skill) => skill.id));
    completedIds.add(skillId);
    const newlyUnlockedIds = new Set(requirements
      .filter((edge) => edge.sourceId === skillId)
      .filter((edge) => skills.find((skill) => skill.id === edge.targetId)?.status === 'LOCKED')
      .filter((edge) => requirements.filter((requirement) => requirement.targetId === edge.targetId).every((requirement) => completedIds.has(requirement.sourceId)))
      .map((edge) => edge.targetId));
    // Every dependency leaving a completed skill gets the full progression
    // animation. A target can remain locked while another prerequisite is
    // pending, but its path should never appear to complete instantly.
    const progressEdges = requirements.filter((edge) => edge.sourceId === skillId).map((edge) => edge.id);

    setCompletingSkillId(skillId);
    setSkills((currentSkills) => currentSkills.map((skill) => skill.id === skillId
      ? { ...skill, status: 'COMPLETED' }
      : skill));
    if (progressEdges.length) {
      setCelebratingEdges(progressEdges);
    }

    const completionRequest = fetch(`${API_URL}/skills/${skillId}/complete`, { method: 'PATCH' });

    try {
      if (progressEdges.length) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, UNLOCK_ANIMATION_MS));
        setSkills((currentSkills) => currentSkills.map((skill) => newlyUnlockedIds.has(skill.id)
          ? { ...skill, status: 'UNLOCKED' }
          : skill));
        setRecentlyUnlockedIds([...newlyUnlockedIds]);
        window.setTimeout(() => setRecentlyUnlockedIds([]), 1650);
        setCelebratingEdges([]);
      }

      const response = await completionRequest;
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setSkills(normalizeSkillNames(payload.skills));
    } catch (requestError) {
      setSkills(previousSkills);
      setCelebratingEdges([]);
      setRecentlyUnlockedIds([]);
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível concluir a habilidade.');
      void fetchData();
    } finally {
      setCompletingSkillId(null);
      setCelebratingEdges([]);
    }
  }, [completingSkillId, fetchData, requirements, skills]);

  const requestCompletion = useCallback((skillId: string) => {
    if (completingSkillId) return;
    const skill = skills.find((item) => item.id === skillId);
    if (skill?.status === 'UNLOCKED') setPendingCompletionSkill(skill);
  }, [completingSkillId, skills]);

  const resetProgress = async () => {
    setIsResetting(true); setError(null);
    try {
      const response = await fetch(`${API_URL}/progress/reset`, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setSkills(normalizeSkillNames(payload.skills));
      setCelebratingEdges([]);
      setRecentlyUnlockedIds([]);
      setIsResetConfirmOpen(false);
      setIsOptionsOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível redefinir o progresso.');
    } finally { setIsResetting(false); }
  };

  const missingRequirementsBySkill = useMemo(() => {
    const missingBySkill = new Map<string, string[]>();
    for (const requirement of requirements) {
      const prerequisite = skills.find((skill) => skill.id === requirement.sourceId);
      const target = skills.find((skill) => skill.id === requirement.targetId);
      if (!prerequisite || !target || prerequisite.status === 'COMPLETED') continue;
      missingBySkill.set(target.id, [...(missingBySkill.get(target.id) ?? []), prerequisite.name]);
    }
    return missingBySkill;
  }, [requirements, skills]);

  const nodes = useMemo(() => layoutSkills(skills, requirements).map((node) => ({
    ...node,
    data: { ...node.data, missingPrerequisites: missingRequirementsBySkill.get(node.id) ?? [], onComplete: requestCompletion, isCompleting: node.id === completingSkillId, justUnlocked: recentlyUnlockedIds.includes(node.id) },
  })), [skills, requirements, requestCompletion, completingSkillId, missingRequirementsBySkill, recentlyUnlockedIds]);
  const mapExtent = useMemo(() => {
    if (!nodes.length) return [[-800, -260], [800, 1600]] as [[number, number], [number, number]];
    const xValues = nodes.map((node) => node.position.x);
    const yValues = nodes.map((node) => node.position.y);
    return [[Math.min(...xValues) - 310, Math.min(...yValues) - 210], [Math.max(...xValues) + 450, Math.max(...yValues) + 260]] as [[number, number], [number, number]];
  }, [nodes]);
  const skillById = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);
  const edges = useMemo<Edge[]>(() => requirements.map((edge) => {
    const source = skillById.get(edge.sourceId);
    const target = skillById.get(edge.targetId);
    const isCelebrating = celebratingEdges.includes(edge.id);
    const active = source?.status === 'COMPLETED' || target?.status === 'UNLOCKED';
    return { id: edge.id, source: edge.sourceId, target: edge.targetId, type: 'progress', animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10 },
      data: { celebrate: isCelebrating },
      className: source?.status === 'COMPLETED' ? 'edge-completed' : active ? 'edge-active' : 'edge-locked',
      style: { stroke: isCelebrating ? '#334155' : source?.status === 'COMPLETED' ? '#34d399' : active ? '#60a5fa' : '#475569', strokeWidth: active ? 2.1 : 1.2, opacity: active ? 0.95 : 0.52 },
    };
  }), [requirements, skillById, celebratingEdges]);

  const completed = skills.filter((skill) => skill.status === 'COMPLETED').length;
  const available = skills.filter((skill) => skill.status === 'UNLOCKED').length;
  const progress = skills.length ? Math.round((completed / skills.length) * 100) : 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setIsSaving(true); setError(null);
    try {
      const response = await fetch(`${API_URL}/skills`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setIsFormOpen(false); setFormData({ name: '', description: '', iconName: 'Code', parentId: '' });
      await fetchData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar a habilidade.');
    } finally { setIsSaving(false); }
  };

  return (
    <main className="app-shell">
      <ParticleBackground />
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><GitBranch size={20} /></span><div><strong>SkillTree</strong><small>Jornada profissional de tecnologia</small></div></div>
        <div className="header-actions"><div className="progress-summary"><span>{completed}/{skills.length} concluídas</span><div><i style={{ width: `${progress}%` }} /></div></div><div className="options-wrap"><button className="icon-button" onClick={() => setIsOptionsOpen((value) => !value)} aria-label="Opções da árvore" aria-expanded={isOptionsOpen} title="Opções"><Settings2 size={18} /></button>{isOptionsOpen && <div className="options-menu"><span>OPÇÕES DA ÁRVORE</span><button onClick={() => { setIsOptionsOpen(false); setIsResetConfirmOpen(true); }}><RotateCcw size={15} />Redefinir progresso</button></div>}</div><button className="primary-button" onClick={() => setIsFormOpen(true)}>+ Nova habilidade</button></div>
      </header>

      <aside className={`journey-card ${isGuideMinimized ? 'minimized' : ''}`}>
        <button className="guide-toggle" onClick={() => setIsGuideMinimized((value) => !value)} aria-label={isGuideMinimized ? 'Expandir roteiro guiado' : 'Minimizar roteiro guiado'} title={isGuideMinimized ? 'Expandir roteiro' : 'Minimizar roteiro'}>{isGuideMinimized ? <ChevronRight size={17} /> : <PanelLeftClose size={17} />}</button>
        {isGuideMinimized ? <Sparkles size={18} /> : <><span className="eyebrow"><Sparkles size={13} /> ROTEIRO GUIADO</span><h1>Comece pela lógica.<br /><em>Construa por camadas.</em></h1><p>Conclua badges disponíveis para liberar os próximos fundamentos e especializações.</p><div className="journey-stats"><div><strong>{available}</strong><span>disponíveis</span></div><div><strong>{progress}%</strong><span>progresso</span></div></div><div className="legend"><span><i className="dot available" />Disponível</span><span><i className="dot locked" />Bloqueado</span><span><i className="dot complete" />Concluído</span></div></>}
      </aside>

      {error && <div className="feedback error"><span>{error}</span><button onClick={() => void fetchData()}>Tentar novamente</button></div>}
      {loading && <div className="feedback loading">Sincronizando sua árvore…</div>}

      {isFormOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsFormOpen(false)}><section className="skill-modal" role="dialog" aria-modal="true" aria-label="Criar habilidade" onMouseDown={(event) => event.stopPropagation()}>
        <span className="eyebrow">EXPANSÃO DA ÁRVORE</span><h2>Nova habilidade</h2><p>Escolha o pré-requisito. A posição será calculada automaticamente.</p>
        <form onSubmit={handleSubmit}>
          <input required placeholder="Nome da habilidade" value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} style={inputStyle} />
          <input placeholder="Descrição curta" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={inputStyle} />
          <select value={formData.iconName} onChange={(event) => setFormData({ ...formData, iconName: event.target.value })} style={inputStyle}><option value="Code">Código / linguagens</option><option value="Server">Backend / APIs</option><option value="Database">Banco de dados</option><option value="Cpu">Hardware / IoT</option><option value="Terminal">Terminal / Git</option><option value="Wrench">Cloud / DevOps</option></select>
          <select value={formData.parentId} onChange={(event) => setFormData({ ...formData, parentId: event.target.value })} style={inputStyle}><option value="">Sem pré-requisito</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>Depende de: {skill.name}</option>)}</select>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setIsFormOpen(false)}>Cancelar</button><button className="save-button" disabled={isSaving}>{isSaving ? 'Salvando…' : 'Adicionar'}</button></div>
        </form>
      </section></div>}

      {pendingCompletionSkill && <div className="modal-backdrop" role="presentation" onMouseDown={() => setPendingCompletionSkill(null)}><section className="skill-modal completion-modal" role="alertdialog" aria-modal="true" aria-label="Confirmar conclusão da habilidade" onMouseDown={(event) => event.stopPropagation()}>
        <span className="eyebrow"><CheckCircle2 size={13} /> CONFIRMAR PROGRESSO</span><h2>Concluir habilidade?</h2><p>Você confirma que concluiu <strong>{pendingCompletionSkill.name}</strong>? O mapa atualizará seu progresso e poderá liberar novos caminhos.</p>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPendingCompletionSkill(null)}>Cancelar</button><button type="button" className="save-button" onClick={() => { const skillId = pendingCompletionSkill.id; setPendingCompletionSkill(null); void completeSkill(skillId); }}>Confirmar conclusão</button></div>
      </section></div>}

      {isResetConfirmOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => !isResetting && setIsResetConfirmOpen(false)}><section className="skill-modal reset-modal" role="alertdialog" aria-modal="true" aria-label="Confirmar redefinição do progresso" onMouseDown={(event) => event.stopPropagation()}>
        <span className="eyebrow"><RotateCcw size={13} /> REDEFINIR PROGRESSO</span><h2>Começar novamente?</h2><p>Isso apaga as habilidades concluídas e bloqueia novamente os próximos passos. A estrutura da árvore e os seus badges personalizados serão preservados.</p>
        <div className="modal-actions"><button type="button" className="secondary-button" disabled={isResetting} onClick={() => setIsResetConfirmOpen(false)}>Cancelar</button><button type="button" className="danger-button" disabled={isResetting} onClick={() => void resetProgress()}>{isResetting ? 'Redefinindo…' : 'Sim, redefinir'}</button></div>
      </section></div>}

      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{ padding: 0.1 }} minZoom={0.28} maxZoom={1.35} translateExtent={mapExtent} defaultEdgeOptions={{ interactionWidth: 24 }} style={{ padding: '82px 24px 24px 310px' }}>
        <Background color="#17223a" gap={26} size={1} />
        <Panel position="bottom-right" className={`minimap-panel ${isMiniMapMinimized ? 'minimized' : ''}`}>
          <button className="minimap-toggle" onClick={() => setIsMiniMapMinimized((value) => !value)} aria-label={isMiniMapMinimized ? 'Expandir minimapa' : 'Minimizar minimapa'} title={isMiniMapMinimized ? 'Expandir minimapa' : 'Minimizar minimapa'}>{isMiniMapMinimized ? <ChevronLeft size={17} /> : <PanelRightClose size={17} />}</button>
          {isMiniMapMinimized ? <MapIcon size={19} /> : <MiniMap nodeColor={(node) => node.data?.status === 'COMPLETED' ? '#34d399' : node.data?.status === 'UNLOCKED' ? '#60a5fa' : '#334155'} maskColor="rgba(2, 6, 23, .7)" pannable zoomable />}
        </Panel>
        <Controls position="top-right" showInteractive={false} />
      </ReactFlow>
    </main>
  );
}
