import { useEffect, useState } from 'react';
import '../styles/progress-bar.css';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  striped?: boolean;
}

export default function ProgressBar({
  progress,
  label,
  showPercentage = true,
  animated = true,
  color = 'primary',
  size = 'md',
  striped = false,
}: ProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Animate progress change
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayProgress(Math.min(100, Math.max(0, progress)));
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(Math.min(100, Math.max(0, progress)));
    }
  }, [progress, animated]);

  const clampedProgress = Math.min(100, Math.max(0, displayProgress));

  return (
    <div className={`progress-bar-container progress-bar-${size}`}>
      {label && (
        <div className="progress-bar-header">
          <span className="progress-bar-label">{label}</span>
          {showPercentage && (
            <span className="progress-bar-percentage">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className={`progress-bar progress-bar-${color} ${striped ? 'progress-bar-striped' : ''} ${animated ? 'progress-bar-animated' : ''}`}>
        <div
          className="progress-bar-fill"
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {!label && showPercentage && (
            <span className="progress-bar-text">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
