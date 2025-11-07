import React from 'react';

interface CircularProgressProps {
  progress: number; // 0 to 100
  className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ progress, className }) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg className={`w-full h-full transform -rotate-90 ${className}`} viewBox="0 0 32 32">
      {/* Background Circle */}
      <circle
        className="text-slate-700"
        strokeWidth="3"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="16"
        cy="16"
      />
      {/* Progress Circle */}
      <circle
        className="text-sky-500"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="16"
        cy="16"
        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
      />
    </svg>
  );
};

export default CircularProgress;
