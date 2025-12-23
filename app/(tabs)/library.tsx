import { View, Text } from "react-native";
import BrandMark from "../components/BrandMark";

export default function LibraryScreen() {
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        backgroundColor: "#fff",
      }}
    >
      <BrandMark />

      <Text
        style={{
          fontSize: 22,
          fontWeight: "600",
          marginBottom: 8,
        }}
      >
        Library
      </Text>

      <Text
        style={{
          fontSize: 14,
          color: "#666",
        }}
      >
        This is the Library screen. Content will appear here.
      </Text>
    </View>
  );
}
