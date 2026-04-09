
import React, { createContext, ReactNode } from 'react';

interface WindowContextType {
  window: Window;
  document: Document;
}

const WindowContext = createContext<WindowContextType>({
  window: typeof window !== 'undefined' ? window : {} as Window,
  document: typeof document !== 'undefined' ? document : {} as Document,
});

interface WindowProviderProps {
  window?: Window;
  document?: Document;
  children: ReactNode;
}

export const WindowProvider: React.FC<WindowProviderProps> = ({
  window: propWindow,
  document: propDocument,
  children,
}) => {
  const value = {
    window: propWindow || (typeof window !== 'undefined' ? window : {} as Window),
    document: propDocument || (typeof document !== 'undefined' ? document : {} as Document),
  };

  return (
    <WindowContext.Provider value={value}>
      {children}
    </WindowContext.Provider>
  );
};

export { WindowContext };
