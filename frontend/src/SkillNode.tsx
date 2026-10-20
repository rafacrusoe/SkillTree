import { Handle, Position } from 'reactflow';
import { Terminal, Cpu, Code2 } from 'lucide-react'; // Pacote de ícones que instalamos

// Tipagem do que o nosso nó vai receber
interface SkillNodeProps {
  data: {
    label: string;
    status: 'LOCKED' | 'UNLOCKED' | 'COMPLETED';
    iconName?: string;
  };
}

export default function SkillNode({ data }: SkillNodeProps) {
  // Define a cor e o brilho baseado no status do banco de dados
  let borderColor = '#444';
  let iconColor = '#666';
  let boxShadow = 'none';
  let bgOpacity = 'rgba(42, 42, 53, 0.6)'; // Fundo escuro e transparente para bloqueado

  if (data.status === 'COMPLETED') {
    borderColor = '#ffd700'; // Dourado
    iconColor = '#ffd700';
    boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)';
    bgOpacity = 'rgba(255, 215, 0, 0.1)';
  } else if (data.status === 'UNLOCKED') {
    borderColor = '#00ffcc'; // Verde Neon
    iconColor = '#00ffcc';
    boxShadow = '0 0 15px rgba(0, 255, 204, 0.4)';
    bgOpacity = 'rgba(0, 255, 204, 0.1)';
  }

  // Uma função simples para renderizar o ícone certo
  const renderIcon = () => {
    if (data.label.includes('Node.js')) return <Terminal size={28} color={iconColor} />;
    if (data.label.includes('ESP32')) return <Cpu size={28} color={iconColor} />;
    return <Code2 size={28} color={iconColor} />; // Ícone padrão
  };

  return (
    // O container principal com formato de losango/hexágono (usando clip-path)
    <div 
      style={{
        width: '70px',
        height: '70px',
        backgroundColor: bgOpacity,
        border: `3px solid ${borderColor}`,
        boxShadow: boxShadow,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', // Formato Hexagonal
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        cursor: data.status === 'LOCKED' ? 'not-allowed' : 'pointer',
      }}
      title={data.label} // O balãozinho nativo que aparece no hover
    >
      {/* Ponto de conexão SUPERIOR (Onde a linha entra) */}
      <Handle type="target" position={Position.Top} style={{ visibility: 'hidden' }} />
      
      {/* O Ícone no meio */}
      {renderIcon()}

      {/* Ponto de conexão INFERIOR (Onde a linha sai) */}
      <Handle type="source" position={Position.Bottom} style={{ visibility: 'hidden' }} />
    </div>
  );
}