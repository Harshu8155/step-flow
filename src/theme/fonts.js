// Font loading for the redesign: Sora (display / big numbers) + Plus Jakarta
// Sans (body / UI). Uses the Google-Fonts Expo packages so no font files need
// to be bundled manually.
//
//   npx expo install expo-font @expo-google-fonts/sora @expo-google-fonts/plus-jakarta-sans
//
// Usage in App.js:
//   const fontsReady = useAppFonts();
//   if (!fontsReady) return null; // or a splash
import {
  useFonts,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';

export function useAppFonts() {
  const [loaded] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  return loaded;
}
