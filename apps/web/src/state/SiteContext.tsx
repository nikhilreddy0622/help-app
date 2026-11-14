import { createContext, useContext } from 'react';

const SiteContext = createContext<{ origin: string }>({ origin: '' });
export const SiteProvider = SiteContext.Provider;
export const useSite = () => useContext(SiteContext);
