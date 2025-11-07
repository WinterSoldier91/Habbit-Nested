import React, { useId } from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, className = '' }) => {
  const id = useId();
  // Key to re-trigger animation
  const [animationKey, setAnimationKey] = React.useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
    if (e.target.checked) {
      setAnimationKey(prev => prev + 1);
    }
  };

  return (
    <div className={`relative flex-shrink-0 mt-1 h-5 w-5 ${className}`}>
        <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            className="absolute opacity-0 w-full h-full cursor-pointer z-10 peer"
        />
        <div
            className={`w-5 h-5 rounded-md border-2 transition-all duration-200
            bg-slate-700 border-slate-500 
            peer-hover:border-sky-400
            peer-checked:bg-teal-500 peer-checked:border-teal-500`}
        >
            {/* Burst Effect - Rendered conditionally to re-trigger animation */}
            {checked && <div key={animationKey} className="absolute -inset-1.5 animate-checkmark-burst rounded-full" />}
            
            {/* Checkmark SVG */}
            <svg
                className={`w-full h-full text-white`}
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M3 7.5L6 10.5L11.5 5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                        strokeDasharray: 20,
                        strokeDashoffset: checked ? 0 : 20,
                        transition: 'stroke-dashoffset 0.25s ease-out',
                    }}
                />
            </svg>
        </div>
    </div>
  );
};

export default Checkbox;
