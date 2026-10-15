import { useState, useEffect } from 'react';

export function useDevicePlatform() {
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(false);
  const [forceAndroidMode, setForceAndroidMode] = useState<boolean>(false);

  useEffect(() => {
    const checkPlatform = () => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
      const androidDetected = /android/.test(ua);
      const mobileWidth = typeof window !== 'undefined' && window.innerWidth < 1024;
      const storedForce = typeof localStorage !== 'undefined' && localStorage.getItem('tf_force_android') === 'true';

      setIsAndroid(androidDetected || (storedForce && mobileWidth));
      setIsMobileScreen(mobileWidth);
      setForceAndroidMode(storedForce);
    };

    checkPlatform();
    window.addEventListener('resize', checkPlatform);
    return () => window.removeEventListener('resize', checkPlatform);
  }, []);

  const toggleForceAndroid = () => {
    const nextVal = !forceAndroidMode;
    setForceAndroidMode(nextVal);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tf_force_android', String(nextVal));
    }
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    setIsAndroid(nextVal || /android/.test(ua));
  };

  return {
    isAndroid,
    isMobileScreen,
    forceAndroidMode,
    toggleForceAndroid,
  };
}
