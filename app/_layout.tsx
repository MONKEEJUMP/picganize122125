import { enableScreens } from "react-native-screens";
enableScreens(false);

const { Stack } = require("expo-router");
const { Platform, Text, TextInput } = require("react-native");
import { ItemsProvider } from "./providers/ItemsProvider";

// iOS-only global default font (LOCKED)
if (Platform.OS === "ios") {
  const prevTextDefaultProps = Text.defaultProps ?? {};
  const prevTextStyle =
    prevTextDefaultProps.style && typeof prevTextDefaultProps.style === "object"
      ? prevTextDefaultProps.style
      : undefined;
  Text.defaultProps = {
    ...prevTextDefaultProps,
    style: [{ fontFamily: "Futura-CondensedExtraBold" }, prevTextStyle].filter(Boolean),
  };

  const prevTextInputDefaultProps = TextInput.defaultProps ?? {};
  const prevTextInputStyle =
    prevTextInputDefaultProps.style && typeof prevTextInputDefaultProps.style === "object"
      ? prevTextInputDefaultProps.style
      : undefined;
  TextInput.defaultProps = {
    ...prevTextInputDefaultProps,
    style: [{ fontFamily: "Futura-CondensedExtraBold" }, prevTextInputStyle].filter(Boolean),
  };
}

export default function RootLayout() {
  return (
    <ItemsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ItemsProvider>
  );
}
