import { useContext } from 'react';
import { WindowContext } from './WindowContext';

export const useWindowContext = () => useContext(WindowContext);
