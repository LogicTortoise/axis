import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  current?: number;
  total?: number;
  showText?: boolean;
  height?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  current,
  total,
  showText = true,
  height = '16px'
}) => {
  // 确保进度在0-100之间
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);

  // 生成显示文本
  const displayText = current !== undefined && total !== undefined
    ? `${current}/${total}`
    : `${normalizedProgress}%`;

  return (
    <div className="w-full flex items-center gap-2">
      <div
        className="flex-1 bg-gray-200 rounded-full overflow-hidden relative"
        style={{ height }}
      >
        <div
          className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300 ease-out"
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
      {showText && (
        <span className="text-xs text-gray-600 min-w-[40px] text-right">
          {displayText}
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
