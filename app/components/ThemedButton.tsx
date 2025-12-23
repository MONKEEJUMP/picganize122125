import React from "react";
import { Pressable, Text } from "react-native";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
};

export default function ThemedButton({ title, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#222",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
        {title}
      </Text>
    </Pressable>
  );
}
