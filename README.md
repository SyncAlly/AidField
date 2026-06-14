# AidField

AidField is an offline-first Android emergency first-aid guidance application built with React Native and Expo. It is designed for use in low-connectivity environments and provides structured, step-by-step triage guidance for common medical emergencies. The app supports both English and Kiswahili, making it accessible to a broad population across Kenya and the wider East African region.

---

## Features

- **AI-Powered Triage:** Uses Google Gemini to generate structured first-aid guidance from text or camera images.
- **Offline-First Architecture:** A local SQLite database stores emergency scenarios and step-by-step instructions so the app works without an internet connection.
- **Kiswahili Support:** Full bilingual support for English and Kiswahili, including speech recognition (sw-KE locale), text-to-speech output, and translated UI labels.
- **Voice Input:** Hands-free voice queries using the device microphone via expo-speech-recognition.
- **Image Triage:** Take a photo or select one from the gallery to receive AI-generated first-aid guidance for visible injuries.
- **Text-to-Speech:** AI responses are read aloud using natural-sounding speech synthesis with correct Swahili ordinal pronunciation (Hatua ya kwanza, Hatua ya pili, etc.).
- **Emergency Call Shortcut:** A persistent banner provides quick access to Kenya emergency numbers (999 / 112).
- **Model Fallback:** If the primary Gemini model is rate-limited or unavailable, the app automatically retries with a fallback model.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo SDK 54) |
| Navigation | React Navigation (Stack + Bottom Tabs) |
| Local Database | expo-sqlite |
| AI Service | Google Gemini API (via Axios) |
| Speech Recognition | expo-speech-recognition |
| Text-to-Speech | expo-speech |
| Image Picker | expo-image-picker |
| Connectivity | @react-native-community/netinfo |
| Environment Variables | react-native-dotenv |

---

## Project Structure

```
AidField/
  src/
    screens/
      HomeScreen.js         - Main triage interface with voice, image, and text input
      SearchScreen.js        - Keyword and AI search tab
      ScenarioScreen.js      - Offline step-by-step scenario viewer
      ScenariosScreen.js     - Browse all scenarios by category
      SettingsScreen.js      - Language, TTS, and emergency contact settings
      VoiceScreen.js         - Dedicated voice triage flow
    services/
      claudeService.js       - Gemini API integration with model fallback
      connectivityService.js - Online/offline detection
    database/
      db.js                  - SQLite schema, seed data, and query functions
    constants/
      colors.js              - App-wide color tokens
      layout.js              - Spacing, radius, and shadow constants
  android/                   - Native Android build files (not tracked in git)
  app.json                   - Expo configuration and plugin declarations
  babel.config.js            - Babel configuration with react-native-dotenv
  index.js                   - App entry point
  App.js                     - Root navigator
```

---

## Setup and Installation

### Prerequisites

- Node.js 18 or later
- Expo CLI: `npm install -g expo-cli`
- Android Studio with an emulator or a physical Android device
- A Google Gemini API key

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/SyncAlly/AidField.git
   cd AidField
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and add your Gemini API key:

   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. Run the app on a connected Android device or emulator:

   ```bash
   npx expo run:android
   ```

---

## Building a Release APK

To generate a signed release APK for distribution:

```bash
cd android
.\gradlew.bat assembleRelease
```

The output APK will be located at:

```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Multilingual Support

The app reads the user's preferred language from the local database settings (configurable via the Settings screen). When Kiswahili is selected:

- The speech recognizer uses the `sw-KE` locale for accurate Swahili transcription.
- The Gemini system prompt is injected with an instruction to respond in Kiswahili while keeping structural parsing headers (URGENCY:, STEPS:, CALL:) in English.
- The text-to-speech engine uses the `sw` language code and correct Swahili ordinal prefixes (Hatua ya kwanza, Hatua ya pili, etc.).
- All visible UI section labels (Do this now, Steps, Improvised Resources, urgency levels) are translated dynamically.
- Offline scenario steps switch to the `instruction_sw` column in the database automatically.

---

## AI Response Parsing

The Gemini response is parsed using the `parseAIResponse` function in `claudeService.js`. The parser extracts the following structural sections from the AI output using fixed English headers:

- `URGENCY:` - Triage urgency level (life-threatening, urgent, moderate)
- `IMMEDIATE ACTION:` - The single most critical action to take first
- `STEPS:` - Numbered step-by-step first-aid instructions
- `IMPROVISED RESOURCES:` - Items that can substitute for proper medical equipment
- `CALL:` - Emergency services or referral note

These headers are always output in English regardless of the selected language, ensuring the parser functions correctly in all locales.

---

## Disclaimer

AidField is intended for educational and immediate guidance purposes only. It does not replace professional medical advice, diagnosis, or treatment. Always call emergency services (999 or 112) in a life-threatening situation.

---

## License

This project is private and not licensed for public redistribution at this time.
