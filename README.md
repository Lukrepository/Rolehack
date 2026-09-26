# Rolehack for Android

Rolehack is a NetHack 5.0 variant built around new roles, with a touch interface designed for two thumbs. This repository is the Android app: [JodiJodington's NetHack 5.0 port](https://github.com/JodiJodington/NetHack-Android) with Rolehack's game changes. It runs the interface from [RolehackFront](https://github.com/Lukrepository/RolehackFront).

- **`rolehack`** — everything Rolehack. This is the branch to use.
- **`master`** — upstream, unchanged.

## What's new

- **A fourteenth role, the Apothecary.** Its quest is set at the Royal Mint in Isaac Newton's London. The quest artifact is the Lapis Philosophorum, and the nemesis is the counterfeiter William Chaloner.
- **Grappling** for Cavemen (`#grapple`). Grip, stun and throw.
- **The Rolehack interface**, in landscape and portrait. Keycaps sit in a terminal case, with the map framed as a screen. There are three colour styles, and the case can be switched off. See the [RolehackFront README](https://github.com/Lukrepository/RolehackFront/blob/rolehack-ui/README.md) for the controls.

## Playing it

You don't need to build anything to play. You need the APK file: an Android app installer.

1. **Get the APK.** There are no public releases yet, so ask Lucas for the file. It is built for 64-bit ARM (`arm64-v8a`), which covers almost every Android phone from the last several years, and it needs **Android 11 or newer**. It asks for no permissions: no network, no storage.
2. **Install.** Open the APK from your Files app or browser. Android asks whether to allow installs from that app; allow it, then tap Install. Google Play Protect may warn that it doesn't recognise the app; choose to install anyway. Rolehack installs as its own app, beside any other NetHack you have, and doesn't touch their saves.
3. **Protect your saves.** Go to Settings → Apps → Rolehack → Battery and choose **Unrestricted**. Otherwise Android may stop the app while it is saving, and the save is lost (from the [upstream notes](UPSTREAM-README.md)).
4. **Hold it either way.** The interface has a landscape layout and a portrait one, and turning the phone mid-game rearranges it without touching the game. Portrait gives the map more height, which suits narrow levels like Sokoban.
5. **Adjust it.** Tap MENU (top right) → Settings → Mobile interface. That screen has the colour style, the case on or off, the fonts, the movement key size, and an overall scale.
6. **Quit with GAME → Save.** That writes a full save and closes the app. If you only switch away, the game keeps a checkpoint instead. If Android then closes the app to free memory, open it again and the game picks up from the checkpoint by itself. Never force-stop it while it's on screen.
7. **Updating.** Save first (GAME → Save), then open the new APK the same way. It installs over the old one and keeps your game and settings.

## Building it

This is the setup that builds the APK today, on Ubuntu 24.04. WSL2 on Windows works; it is what this was built on.

**You need:**

- `gcc`, `make`, `git` and `curl`;
- **JDK 17**;
- the Android SDK command-line tools, with `platforms;android-36` and `build-tools;36.0.0`;
- the **Android NDK r27d**. The makefiles expect it at `/opt/android-ndk-r27d`.

**RolehackFront must be checked out beside this repository.** The Gradle build includes it from `../../../RolehackFront`, relative to `sys/android`:

```
somewhere/RolehackDroid     <- this repository, branch rolehack
somewhere/RolehackFront     <- branch rolehack-ui
```

```sh
git clone -b rolehack    https://github.com/Lukrepository/RolehackDroid.git
git clone -b rolehack-ui https://github.com/Lukrepository/RolehackFront.git
cd RolehackDroid

# Only if your NDK is somewhere other than /opt/android-ndk-r27d:
sed -i "s,^NDK = .*,NDK = /path/to/android-ndk-r27d," sys/android/Makefile.src sys/android/Makefile.top

(cd sys/android && sh ./setup.sh)
make fetch-lua
make install      # the native game library, into sys/android/app/libs/arm64-v8a/

cd sys/android
echo "sdk.dir=/path/to/android-sdk" > local.properties
export ANDROID_NDK_HOME=/opt/android-ndk-r27d   # lets Gradle strip the game library
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew assembleDebug
# -> app/build/outputs/apk/debug/app-arm64-v8a-debug.apk

adb install -r app/build/outputs/apk/debug/app-arm64-v8a-debug.apk
```

**Changed game data?** If you changed anything the game reads from `dat/` (levels, quest text), raise the number in `sys/android/app/assets/ver` by one. The app only unpacks its data again when that number changes. Stay within the same hundred: going from 1xx to 2xx makes the app delete every saved game and bones file on the phone.

**Signing.** A debug build is signed with your own machine's debug key (`~/.android/debug.keystore`). Android only installs an update signed with the same key, so a copy you built can't replace one someone else built. You would have to uninstall theirs first, and that deletes its saves.

**Release builds** are signed with a key that never enters the repository. Make it once, and keep two backups: lose it and no update can ever install over the copies people already have.

```sh
keytool -genkeypair -v -keystore rolehack-release.jks -alias rolehack \
        -keyalg RSA -keysize 4096 -validity 10000
```

Then create `sys/android/keystore.properties` (git ignores it) with:

```
storeFile=/path/to/rolehack-release.jks
storePassword=...
keyAlias=rolehack
keyPassword=...
```

and build with `./gradlew assembleRelease`, which gives `app/build/outputs/apk/release/app-arm64-v8a-release.apk`. Without the properties file the release APK comes out unsigned. Check the result with `apksigner verify --print-certs`: the certificate must be your key, not "Android Debug".

**Versions.** `versionName` in `sys/android/app/build.gradle` and `ROLEHACK_VERSION` in `include/patchlevel.h` are Rolehack's own number, and move together. `versionCode` only ever goes up.

## Credits and licences

- **NetHack 5.0:** the NetHack DevTeam, under the NetHack General Public License (`dat/license`).
- **NetHack for Android:** gurrhack, with the NetHack 5.0 port by JodiJodington. The upstream README is kept here as [UPSTREAM-README.md](UPSTREAM-README.md).
- **The ForkFront user interface:** gurrhack and JodiJodington, with the Rolehack interface in [RolehackFront](https://github.com/Lukrepository/RolehackFront). ForkFront has no licence file in its upstream repositories; its copyright remains with its authors.
- **Rolehack:** Lucas Ruiz, co-authored with Claude, Anthropic's AI model.
