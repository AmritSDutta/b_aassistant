import React from 'react';

export const BlankSlot: React.FC = () => {
  return (
    <div className="flex-1 p-4 flex flex-col justify-center items-center text-center text-slate-400 dark:text-slate-600 border-dashed border-t border-slate-200 dark:border-slate-800">
      <div className="text-xs font-mono tracking-wider uppercase opacity-60">
        Section 3
      </div>
      <div className="text-[10px] mt-1 opacity-40">
        Reserved for future tools
      </div>
    </div>
  );
};
