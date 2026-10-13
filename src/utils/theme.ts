export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  hover: string;
  light: string;
  border: string;
}

export const colorThemes: ColorTheme[] = [
  {
    id: 'indigo',
    name: 'Indigo Royal',
    primary: '#1f108e',
    hover: '#170b6e',
    light: '#eff4ff',
    border: 'rgba(31, 16, 142, 0.3)',
  },
  {
    id: 'emerald',
    name: 'Émeraude',
    primary: '#059669',
    hover: '#047857',
    light: '#ecfdf5',
    border: 'rgba(5, 150, 105, 0.3)',
  },
  {
    id: 'violet',
    name: 'Violet Améthyste',
    primary: '#7c3aed',
    hover: '#6d28d9',
    light: '#f5f3ff',
    border: 'rgba(124, 58, 237, 0.3)',
  },
  {
    id: 'ocean',
    name: 'Océan Cyan',
    primary: '#0284c7',
    hover: '#0369a1',
    light: '#f0f9ff',
    border: 'rgba(2, 132, 199, 0.3)',
  },
  {
    id: 'crimson',
    name: 'Rubis Rouge',
    primary: '#e11d48',
    hover: '#be123c',
    light: '#fff1f2',
    border: 'rgba(225, 29, 72, 0.3)',
  },
  {
    id: 'amber',
    name: 'Ambre Chaud',
    primary: '#ea580c',
    hover: '#c2410c',
    light: '#fff7ed',
    border: 'rgba(234, 88, 12, 0.3)',
  },
  {
    id: 'slate',
    name: 'Obsidienne',
    primary: '#0f172a',
    hover: '#020617',
    light: '#f8fafc',
    border: 'rgba(15, 23, 42, 0.3)',
  },
];

export const applyTheme = (theme: ColorTheme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    document.documentElement.style.setProperty('--primary-hover', theme.hover);
    document.documentElement.style.setProperty('--primary-light', theme.light);
    document.documentElement.style.setProperty('--primary-border', theme.border);
    localStorage.setItem('tf_color_theme', theme.id);
  }
};

export const applyFontSize = (percentage: number) => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.fontSize = `${percentage}%`;
    localStorage.setItem('tf_font_size_pct', percentage.toString());
  }
};

export const getInitialTheme = (): ColorTheme => {
  if (typeof window !== 'undefined') {
    const savedId = localStorage.getItem('tf_color_theme');
    const found = colorThemes.find((t) => t.id === savedId);
    if (found) return found;
  }
  return colorThemes[0];
};

export const getInitialFontSize = (): number => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tf_font_size_pct');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 70 && parsed <= 130) {
        return parsed;
      }
    }
  }
  return 90; // Default slightly smaller font scale for a tighter UI
};

export const DEFAULT_BRANDING = {
  appName: 'TicketFlow',
  appSubtitle: 'Operational Control',
  appLogoUrl: '',
  commentary: 'Plateforme de gestion centralisée des tickets et suivi des équipes de développement.',
  proposedAvatars: [],
};

export const getInitialBranding = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('tf_app_branding');
    if (saved) {
      try {
        return { ...DEFAULT_BRANDING, ...JSON.parse(saved) };
      } catch (e) {}
    }
  }
  return DEFAULT_BRANDING;
};

export const saveBrandingToLocal = (branding: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tf_app_branding', JSON.stringify(branding));
  }
};
