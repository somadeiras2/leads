import React from 'react';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  sublabel?: string;
  color?: 'blue' | 'emerald' | 'amber';
  height?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  sublabel,
  color = 'blue',
  height = 'md'
}) => {
  const safePercentage = Math.min(100, Math.max(0, percentage));

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const colors = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500'
  };

  return (
    <div className="w-full">
      {(label || sublabel) && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          {label && <span className="text-slate-700">{label}</span>}
          {sublabel && <span className="text-slate-500">{sublabel}</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heights[height]}`}>
        <div
          className={`${colors[color]} h-full rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${safePercentage}%` }}
        />
      </div>
    </div>
  );
};
