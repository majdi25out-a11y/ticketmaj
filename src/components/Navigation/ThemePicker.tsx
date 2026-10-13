import React, { useState, useEffect, useRef } from 'react';
import { colorThemes, applyTheme, getInitialTheme, ColorTheme } from '../../utils/theme';

export const ThemePicker: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(getInitialTheme());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (theme: ColorTheme) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[#464553] hover:bg-[#eff4ff] rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
        title="Changer la couleur du thème"
        aria-label="Changer la couleur du thème"
      >
        <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">
          palette
        </span>
        <span
          className="w-3 h-3 rounded-full border border-white shadow-xs inline-block"
          style={{ backgroundColor: currentTheme.primary }}
        ></span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-[#c8c4d5]/50 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#c8c4d5]/30">
            <div className="flex items-center gap-2 text-[#0b1c30]">
              <span className="material-symbols-outlined text-lg text-theme-primary">
                color_lens
              </span>
              <span className="text-xs font-bold">Thème de Couleur</span>
            </div>
            <span className="text-[10px] bg-theme-light text-theme-primary px-2 py-0.5 rounded-full font-bold">
              {currentTheme.name}
            </span>
          </div>

          <div className="space-y-1">
            {colorThemes.map((theme) => {
              const isSelected = currentTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-theme-light text-theme-primary border border-theme-primary/30'
                      : 'hover:bg-gray-50 text-[#0b1c30]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/10 shadow-xs flex-shrink-0"
                      style={{ backgroundColor: theme.primary }}
                    ></span>
                    <span>{theme.name}</span>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-base text-theme-primary">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
