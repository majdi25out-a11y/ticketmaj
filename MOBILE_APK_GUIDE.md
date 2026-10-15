# Guide de Génération de la Version Mobile & APK (Android) - TicketFlow

TicketFlow intègre un support mobile complet permettant de faire fonctionner l'application sur smartphone Android et iOS de trois manières complémentaires :

---

## Option 1 : Installation Directe en WebAPK Android (Recommandé - Immédiat)
Sous Android (Google Chrome, Microsoft Edge, Brave, Samsung Internet), l'application est configurée comme une **PWA installable conforme (WebAPK)**.

### Comment l'installer sur votre téléphone :
1. Ouvrez l'URL de votre application sur le navigateur de votre smartphone (ou scannez le QR code disponible dans le modal **« APK Mobile »**).
2. Appuyez sur le menu **(⋮)** en haut à droite du navigateur.
3. Cliquez sur **« Installer l'application »** ou **« Ajouter à l'écran d'accueil »**.
4. **Android utilise automatiquement le service Google WebAPK pour générer et installer un véritable fichier APK natif** dans le système.
5. L'application apparaît dans votre lanceur d'applications, sans la barre d'adresse du navigateur, avec icône HD, écran de démarrage personnalisé et fonctionnement hors-ligne.

---

## Option 2 : Génération d'un fichier APK autonome via PWABuilder (Cloud)
Si vous désirez un fichier physique `TicketFlow.apk` téléchargeable ou un package `.aab` pour le Google Play Store sans installer Android Studio ni Java :

1. Cliquez sur le bouton **« APK Mobile »** dans la barre de navigation ou les paramètres.
2. Choisissez l'onglet **« 2. Générateur APK Cloud »**.
3. Cliquez sur **« Ouvrir PWABuilder & Générer mon APK »** (ou rendez-vous sur [pwabuilder.com](https://www.pwabuilder.com) en collant l'URL de l'application).
4. Cliquez sur **« Package for Stores »** puis **« Android »**.
5. PWABuilder compile automatiquement le fichier APK natif et vous fournit un lien de téléchargement direct en moins de 30 secondes.

---

## Option 3 : Compilation Locale avec Capacitor & Android Studio (Projet Natif)
Un projet Android complet prêt à être compilé est inclus dans le code source et téléchargeable en un clic au format `.zip` via l'application.

### Commandes pour compiler :
```bash
# 1. Compiler les assets web
npm run build

# 2. Synchroniser le projet natif Android avec Capacitor
npx cap sync android

# 3. Ouvrir dans Android Studio
npx cap open android
# OU compiler directement en ligne de commande :
cd android && ./gradlew assembleDebug
```

Le fichier APK compilé sera disponible dans :
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## Caractéristiques Techniques de la Version Mobile :
- **Package ID** : `com.ticketflow.app`
- **Moteur** : Capacitor 7 + Vite PWA + Service Worker Workbox
- **Icônes incluses** : 192x192, 512x512, 512x512 maskable, 180x180 Apple Touch
- **Support Hors-Ligne** : Mise en cache automatique des polices et ressources critiques
- **Navigation Optimisée** : Barre de navigation tactile mobile basse avec adaptation aux encoches (Safe Area Insets)

---

## 🔔 Notifications Android (Avant-plan & Arrière-plan) :
TicketFlow prend en charge l'affichage des alertes dans le tiroir système d'Android :
1. **Autorisation système** : Cliquez sur **« Activer les notifications »** dans le tiroir de notifications ou les Paramètres pour accorder l'autorisation au niveau d'Android.
2. **Fonctionnement en avant-plan** : Lorsqu'un ticket vous est assigné ou qu'une modification survient, une notification s'affiche accompagnée d'un carillon audio et d'une vibration.
3. **Fonctionnement en arrière-plan** : Le Service Worker (`sw-notifications.js`) et le récepteur d'arrière-plan affichent les alertes dans la barre d'état Android même lorsque l'application est fermée ou en arrière-plan. Cliquer sur la notification ouvre directement le ticket concerné.
4. **Android 13+ (API 33+)** : La permission requise `android.permission.POST_NOTIFICATIONS` est intégrée dans le projet Android Studio (`AndroidManifest.xml`) et dans `MainActivity.java`.
5. **Test immédiat** : Un bouton **« Tester la notification »** est disponible dans le menu Notifications pour vérifier la réception instantanée sur votre appareil.
