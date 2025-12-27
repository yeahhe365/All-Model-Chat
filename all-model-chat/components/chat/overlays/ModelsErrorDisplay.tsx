
import React from 'react';

interface ModelsErrorDisplayProps {
  error: string | null;
}

export const ModelsErrorDisplay: React.FC<ModelsErrorDisplayProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <div className="mx-2 my-1 p-2 text-sm text-center text-[var(--theme-text-danger)] bg-[var(--theme-bg-error-message)] border border-[var(--theme-bg-danger)] rounded-md flex-shrink-0">
      {error}
    </div>
  );
};
