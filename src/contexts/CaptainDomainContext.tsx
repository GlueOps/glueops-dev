import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'glueops_captain_domain';
const DEFAULT_DOMAIN = 'nonprod.antoniostacos.onglueops.com';

interface CaptainDomainContextType {
  captainDomain: string;
  setCaptainDomain: (domain: string) => void;
  isDefault: boolean;
}

const CaptainDomainContext = createContext<CaptainDomainContextType>({
  captainDomain: DEFAULT_DOMAIN,
  setCaptainDomain: () => {},
  isDefault: true,
});

export function CaptainDomainProvider({ children }: { children: ReactNode }) {
  const [captainDomain, setCaptainDomainState] = useState(DEFAULT_DOMAIN);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCaptainDomainState(stored);
    }
  }, []);

  const setCaptainDomain = (domain: string) => {
    const value = domain.trim() || DEFAULT_DOMAIN;
    setCaptainDomainState(value);
    if (value === DEFAULT_DOMAIN) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
  };

  return (
    <CaptainDomainContext.Provider
      value={{
        captainDomain,
        setCaptainDomain,
        isDefault: captainDomain === DEFAULT_DOMAIN,
      }}
    >
      {children}
    </CaptainDomainContext.Provider>
  );
}

export function useCaptainDomain() {
  return useContext(CaptainDomainContext);
}

export { DEFAULT_DOMAIN };
