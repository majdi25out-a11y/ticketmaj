import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { generateAndroidProjectZip } from '../../utils/androidProjectGenerator';
import { generateQRCodeSVG } from '../../utils/qrCodeGenerator';
import { AppBrandingConfig } from '../../types';

interface MobileApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  branding?: AppBrandingConfig;
}

export const MobileApkModal: React.FC<MobileApkModalProps> = ({
  isOpen,
  onClose,
  branding,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'cloud' | 'native' | 'ios'>('direct');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();

  if (!isOpen) return null;

  const [statusNotification, setStatusNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const appName = branding?.appName || 'TicketFlow';
  const appId = 'com.ticketflow.app';
  const currentAppUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ticketflow.app';

  const handleInstallClick = async () => {
    try {
      const res = await install();
      if (res === 'accepted') {
        setStatusNotification({ message: 'Installation lancée ! L\'application est désormais ajoutée à votre appareil.', type: 'success' });
      } else if (res === 'unsupported') {
        setStatusNotification({ message: 'L\'installation directe n\'est pas supportée dans cette vue navigateur. Utilisez le menu de votre navigateur (Ajouter à l\'écran d\'accueil) ou scannez le QR code ci-dessous depuis votre smartphone Android.', type: 'info' });
      }
    } catch (e) {
      console.error(e);
      setStatusNotification({ message: 'Erreur lors du lancement de l\'installation.', type: 'error' });
    }
  };

  const handleDownloadAndroidZip = async () => {
    setIsDownloadingZip(true);
    try {
      const blob = await generateAndroidProjectZip({
        appName,
        appId,
        versionName: '1.0.0',
        versionCode: 1,
        serverUrl: currentAppUrl,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName.toLowerCase().replace(/\s+/g, '-')}-android-project.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusNotification({ message: 'Téléchargement du projet Android lancé avec succès !', type: 'success' });
    } catch (err) {
      console.error('Erreur génération package Android:', err);
      setStatusNotification({ message: 'Une erreur est survenue lors de la génération du projet Android.', type: 'error' });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const pwaBuilderUrl = `https://www.pwabuilder.com?url=${encodeURIComponent(currentAppUrl)}`;
  const qrCodeUrl = generateQRCodeSVG(currentAppUrl, 220);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1f108e] to-[#3730a3] text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner flex-shrink-0">
              <span className="material-symbols-outlined text-3xl text-emerald-300">
                android
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="mobile-modal-title" className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Générateur Version Mobile (APK)
                </h2>
                <span className="bg-emerald-400 text-slate-900 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Android & PWA
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-1">
                Installez {appName} en application native Android (APK) ou exportez le projet complet
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 pt-2 overflow-x-auto no-scrollbar gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'direct'
                ? 'border-[#1f108e] text-[#1f108e] bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-lg">install_mobile</span>
            <span>1. Installation WebAPK (Direct)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-[#1f108e] text-[#1f108e] bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-lg">cloud_download</span>
            <span>2. Générateur APK Cloud</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('native')}
            className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'native'
                ? 'border-[#1f108e] text-[#1f108e] bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-lg">code</span>
            <span>3. Projet Gradle Android (.zip)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-2 py-2.5 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ios'
                ? 'border-[#1f108e] text-[#1f108e] bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-lg">phone_iphone</span>
            <span>4. Guide iOS Safari</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {statusNotification && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 ${
                statusNotification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusNotification.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                  {statusNotification.type === 'success' ? 'check_circle' : statusNotification.type === 'error' ? 'error' : 'info'}
                </span>
                <span>{statusNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusNotification(null)}
                className="p-1 hover:bg-black/5 rounded cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}
          {/* TAB 1: Direct WebAPK Install */}
          {activeTab === 'direct' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-emerald-600 flex-shrink-0 mt-0.5">
                  verified
                </span>
                <div className="text-xs text-emerald-950">
                  <p className="font-bold text-sm text-emerald-900">
                    Génération Automatique WebAPK sous Android
                  </p>
                  <p className="mt-1 leading-relaxed">
                    Sur les téléphones Android (Google Chrome, Edge, Brave, Samsung Internet), l'application utilise le service officiel Google WebAPK. Dès l'installation, <strong>Android compile et installe un véritable fichier APK natif</strong> avec icône autonome, écran de lancement, support hors-ligne et accès plein écran.
                  </p>
                </div>
              </div>

              {/* Status & Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Statut de compatibilité
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${isInstalled ? 'bg-indigo-500' : isInstallable ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
                      <span className="text-xs font-extrabold text-slate-900">
                        {isInstalled
                          ? 'Application déjà installée en mode autonome'
                          : isInstallable
                          ? 'Prêt pour l\'installation immédiate (APK / PWA)'
                          : isAndroid
                          ? 'Prêt pour ajout à l\'écran d\'accueil'
                          : 'Prêt pour scan mobile'}
                      </span>
                    </div>
                  </div>

                  {isInstallable && (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="w-full flex items-center justify-center gap-2 bg-[#1f108e] text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-[#312e81] shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">download_for_offline</span>
                      <span>Installer l'APK directement sur cet appareil</span>
                    </button>
                  )}

                  <div className="text-[11px] text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">Comment installer sur smartphone Android :</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>Ouvrez l'application dans <strong>Google Chrome</strong> sur mobile</li>
                      <li>Appuyez sur le menu à 3 points <strong>(⋮)</strong> en haut à droite</li>
                      <li>Touchez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong></li>
                      <li>L'APK s'installe automatiquement sur votre écran d'accueil et tiroir d'applications</li>
                    </ol>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#1f108e]">qr_code_scanner</span>
                    Scanner avec votre téléphone Android
                  </p>
                  <div className="w-40 h-40 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-center">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code Mobile"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(currentAppUrl, 'URL copiée')}
                    className="mt-2.5 text-[11px] text-[#1f108e] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>{copyFeedback === 'URL copiée' ? 'Copié !' : 'Copier le lien mobile'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Cloud APK via PWABuilder */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-[#1f108e] flex-shrink-0 mt-0.5">
                  cloud
                </span>
                <div className="text-xs text-indigo-950">
                  <p className="font-bold text-sm text-[#1f108e]">
                    Génération d'APK autonome dans le Cloud (PWABuilder)
                  </p>
                  <p className="mt-1 leading-relaxed">
                    <strong>PWABuilder</strong> est l'outil officiel soutenu par Microsoft et Google pour générer des fichiers <strong>.apk</strong> (prêts pour sideload) et des packages <strong>.aab</strong> (Google Play Store) directement depuis le Web, sans installer Android Studio.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL de l'application à convertir en APK :
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={currentAppUrl}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(currentAppUrl, 'URL copiée')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">content_copy</span>
                      <span>{copyFeedback === 'URL copiée' ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <a
                    href={pwaBuilderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#1f108e] text-white py-3 px-5 rounded-xl text-xs font-bold hover:bg-[#312e81] shadow-md transition-all cursor-pointer text-center"
                  >
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                    <span>Ouvrir PWABuilder & Générer mon APK</span>
                  </a>
                </div>

                <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-600 space-y-1.5">
                  <p className="font-bold text-slate-800">Étapes sur PWABuilder :</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>L'URL ci-dessus est analysée avec le manifest et les icônes PWA déjà configurés.</li>
                    <li>Cliquez sur <strong>« Package for Stores »</strong> puis sélectionnez <strong>« Android »</strong>.</li>
                    <li>Téléchargez directement le fichier <strong>TicketFlow.apk</strong> sur votre ordinateur ou téléphone !</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Native Gradle Project (.zip) */}
          {activeTab === 'native' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-2xl">folder_zip</span>
                    <h3 className="font-bold text-sm text-white">Projet Android Studio & Gradle Prêt à l'Emploi</h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-md">
                    Téléchargez le projet Android complet zippé avec <code>AndroidManifest.xml</code>, <code>MainActivity.java</code>, scripts Gradle et icônes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadAndroidZip}
                  disabled={isDownloadingZip}
                  className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <span className={`material-symbols-outlined text-lg ${isDownloadingZip ? 'animate-spin' : ''}`}>
                    {isDownloadingZip ? 'sync' : 'download'}
                  </span>
                  <span>{isDownloadingZip ? 'Génération...' : 'Télécharger Projet Android (.zip)'}</span>
                </button>
              </div>

              {/* CLI Commands */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#1f108e]">terminal</span>
                    Commandes Capacitor & Gradle (Compilation locale) :
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText("npm run build && npx cap sync android && cd android && ./gradlew assembleDebug", 'Commandes copiées')}
                    className="text-[11px] text-[#1f108e] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>{copyFeedback === 'Commandes copiées' ? 'Copié !' : 'Copier commandes'}</span>
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-[11px] overflow-x-auto space-y-1">
                  <p className="text-slate-400"># 1. Compiler les assets web</p>
                  <p className="text-emerald-300">npm run build</p>
                  <p className="text-slate-400 mt-2"># 2. Synchroniser le projet Android</p>
                  <p className="text-emerald-300">npx cap sync android</p>
                  <p className="text-slate-400 mt-2"># 3. Compiler le fichier APK de débogage</p>
                  <p className="text-emerald-300">cd android && ./gradlew assembleDebug</p>
                  <p className="text-slate-400 mt-2"># Fichier généré : android/app/build/outputs/apk/debug/app-debug.apk</p>
                </div>
              </div>

              {/* Project Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Package ID</span>
                  <p className="font-mono font-bold text-slate-800 text-[11px] truncate">{appId}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Target SDK</span>
                  <p className="font-bold text-slate-800 text-xs">Android 14 (API 34)</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Min SDK</span>
                  <p className="font-bold text-slate-800 text-xs">Android 5.1 (API 22)</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Moteur</span>
                  <p className="font-bold text-slate-800 text-xs">Capacitor + WebView</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Apple iOS Guide */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl text-slate-800">apple</span>
                  <h3 className="font-bold text-sm text-slate-900">Installation sur iPhone & iPad (iOS Safari)</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apple iOS ne supporte pas le format de fichier .apk (exclusif à Android), mais supporte à 100% le mode PWA plein écran avec icône native Apple Touch.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-1">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-[#1f108e] font-bold text-xs inline-flex items-center justify-center">1</span>
                    <p className="font-bold text-xs text-slate-800">Ouvrir dans Safari</p>
                    <p className="text-[11px] text-slate-500">Ouvrez l'URL de TicketFlow avec le navigateur Safari.</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-1">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-[#1f108e] font-bold text-xs inline-flex items-center justify-center">2</span>
                    <p className="font-bold text-xs text-slate-800">Bouton Partager</p>
                    <p className="text-[11px] text-slate-500">Touchez l'icône de partage <strong>(carré avec flèche vers le haut)</strong>.</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-1">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-[#1f108e] font-bold text-xs inline-flex items-center justify-center">3</span>
                    <p className="font-bold text-xs text-slate-800">Sur l'écran d'accueil</p>
                    <p className="text-[11px] text-slate-500">Faites défiler et sélectionnez <strong>« Sur l'écran d'accueil »</strong>.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
            <span>Service Worker & Manifest PWA actifs</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
