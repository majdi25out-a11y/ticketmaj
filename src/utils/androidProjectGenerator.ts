import JSZip from 'jszip';

export interface AndroidProjectConfig {
  appName: string;
  appId: string;
  versionName: string;
  versionCode: number;
  serverUrl: string;
}

export async function generateAndroidProjectZip(config: AndroidProjectConfig): Promise<Blob> {
  const zip = new JSZip();
  const { appName, appId, versionName, versionCode, serverUrl } = config;
  const packagePath = appId.replace(/\./g, '/');

  // capacitor.config.json
  const capacitorConfig = {
    appId,
    appName,
    webDir: 'dist',
    bundledWebRuntime: false,
    server: {
      url: serverUrl,
      cleartext: true,
      androidScheme: 'https',
    },
    android: {
      allowMixedContent: true,
      backgroundColor: '#1f108e',
    },
  };
  zip.file('capacitor.config.json', JSON.stringify(capacitorConfig, null, 2));

  // README_BUILD_APK.md
  const readmeContent = `# ${appName} - Guide de Compilation APK Android

Ce dossier contient la configuration Android complète et le projet prêt pour compiler le fichier **${appName}.apk** natif.

## Méthode 1 : Compilation Rapide en Ligne de Commande (CLI)
Si vous avez Java (JDK 17+) et Android SDK installé :

\`\`\`bash
# 1. Rendre le script exécutable (Linux / macOS)
chmod +x build-apk.sh
./build-apk.sh

# Sur Windows :
build-apk.bat
\`\`\`

Le fichier APK sera généré dans :
\`android/app/build/outputs/apk/debug/app-debug.apk\`

---

## Méthode 2 : Avec Android Studio (Recommandé avec interface graphique)
1. Ouvrez **Android Studio**.
2. Cliquez sur **Open** et sélectionnez le dossier \`android/\`.
3. Laissez Gradle synchroniser les dépendances (1-2 minutes).
4. Dans le menu haut : **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. Une notification apparaîtra avec un lien direct **locate** vers le fichier \`app-debug.apk\`.
6. Transférez ce fichier sur votre téléphone Android et appuyez dessus pour l'installer !

---

## Méthode 3 : Directement en WebAPK (Sans compilation locale)
Ouvrez l'application depuis Google Chrome sur votre téléphone Android :
- Appuyez sur le menu **(⋮)** en haut à droite.
- Cliquez sur **Installer l'application** ou **Ajouter à l'écran d'accueil**.
- Android crée et installe automatiquement un véritable fichier APK natif dans votre tiroir d'applications.

---

## Informations du projet :
- **Application Name** : ${appName}
- **Package ID** : ${appId}
- **Version** : ${versionName} (Code: ${versionCode})
- **Target URL** : ${serverUrl}
`;
  zip.file('README_BUILD_APK.md', readmeContent);

  // Shell script build-apk.sh
  const buildSh = `#!/usr/bin/env bash
set -e
echo "=============================================="
echo " Compilation de l'APK Android pour ${appName}"
echo "=============================================="

if ! command -v java &> /dev/null; then
    echo "ERREUR: Java JDK n'est pas installé. Veuillez installer JDK 17 ou ouvrir le projet dans Android Studio."
    exit 1
fi

cd android
if [ -f "./gradlew" ]; then
    chmod +x ./gradlew
    ./gradlew assembleDebug
    echo "=============================================="
    echo "SUCCÈS ! Votre APK a été compilé avec succès :"
    echo "app/build/outputs/apk/debug/app-debug.apk"
    echo "=============================================="
else
    echo "Veuillez ouvrir le projet dans Android Studio pour générer l'environnement Gradle initial."
fi
`;
  zip.file('build-apk.sh', buildSh);

  // Batch script build-apk.bat
  const buildBat = `@echo off
echo ==============================================
echo  Compilation de l'APK Android pour ${appName}
echo ==============================================

cd android
if exist gradlew.bat (
    call gradlew.bat assembleDebug
    echo ==============================================
    echo SUCCES ! Votre APK est genere dans :
    echo app\\build\\outputs\\apk\\debug\\app-debug.apk
    echo ==============================================
) else (
    echo Veuillez ouvrir le projet dans Android Studio.
)
pause
`;
  zip.file('build-apk.bat', buildBat);

  // root android/build.gradle
  const rootBuildGradle = `buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`;
  zip.file('android/build.gradle', rootBuildGradle);

  // android/settings.gradle
  const settingsGradle = `rootProject.name = '${appName.replace(/[^a-zA-Z0-9]/g, '')}'
include ':app'
`;
  zip.file('android/settings.gradle', settingsGradle);

  // android/gradle.properties
  const gradleProperties = `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
`;
  zip.file('android/gradle.properties', gradleProperties);

  // android/app/build.gradle
  const appBuildGradle = `apply plugin: 'com.android.application'

android {
    namespace "${appId}"
    compileSdk 34

    defaultConfig {
        applicationId "${appId}"
        minSdk 22
        targetSdk 34
        versionCode ${versionCode}
        versionName "${versionName}"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.core:core-splashscreen:1.0.1'
    implementation 'androidx.coordinatorlayout:coordinatorlayout:1.2.0'
    implementation 'androidx.webkit:webkit:1.9.0'
}
`;
  zip.file('android/app/build.gradle', appBuildGradle);

  // android/app/src/main/AndroidManifest.xml
  const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name="${appId}.MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:launchMode="singleTask"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>
    </application>

</manifest>
`;
  zip.file('android/app/src/main/AndroidManifest.xml', androidManifest);

  // MainActivity.java
  const mainActivity = `package ${appId};

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request runtime notification permission on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setAllowFileAccess(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });

        webView.loadUrl("${serverUrl}");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`;
  zip.file(`android/app/src/main/java/${packagePath}/MainActivity.java`, mainActivity);

  // Resources strings.xml
  const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName}</string>
    <string name="package_name">${appId}</string>
</resources>
`;
  zip.file('android/app/src/main/res/values/strings.xml', stringsXml);

  // styles.xml
  const stylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="colorPrimary">#1f108e</item>
        <item name="colorPrimaryDark">#170b6e</item>
        <item name="colorAccent">#3730a3</item>
        <item name="android:statusBarColor">#1f108e</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="AppTheme">
        <item name="android:windowBackground">#1f108e</item>
    </style>
</resources>
`;
  zip.file('android/app/src/main/res/values/styles.xml', stylesXml);

  // Generate blob
  return await zip.generateAsync({ type: 'blob' });
}
