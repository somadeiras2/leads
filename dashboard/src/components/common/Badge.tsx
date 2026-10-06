import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'novo' | 'interessado' | 'cliente' | 'vip' | 'pendente' | 'adicionado' | 'nao_adicionado' | 'erro' | 'ja_no_grupo' | 'em_andamento' | 'concluido' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md'
}) => {
  const styles: Record<string, string> = {
    novo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    interessado: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    cliente: 'bg-teal-50 text-teal-700 border-teal-200',
    vip: 'bg-amber-50 text-amber-700 border-amber-200',
    pendente: 'bg-amber-50 text-amber-700 border-amber-200',
    adicionado: 'bg-blue-50 text-blue-700 border-blue-200',
    nao_adicionado: 'bg-rose-50 text-rose-700 border-rose-200',
    erro: 'bg-red-50 text-red-700 border-red-200',
    ja_no_grupo: 'bg-purple-50 text-purple-700 border-purple-200',
    em_andamento: 'bg-blue-50 text-blue-700 border-blue-200',
    concluido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const normalizedVariant = (typeof children === 'string'
    ? children.toLowerCase().replace(/\s+/g, '_')
    : variant) in styles ? (typeof children === 'string' ? children.toLowerCase().replace(/\s+/g, '_') : variant) : variant;

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizeStyles[size]} ${styles[normalizedVariant] || styles.neutral}`}>
      {children}
    </span>
  );
};
