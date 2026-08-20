import { useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { AdminTheme } from "@/lib/admin-theme";

/**
 * Dark "Ops Console" page ground for the admin panel — a vertical dark-teal
 * gradient. Rendered once in app/admin/_layout.tsx behind the rail + content,
 * the admin equivalent of the app's light GradientBackground.
 */
export default function AdminBackground() {
  const { width, height } = useWindowDimensions();
  const [top, mid, bottom] = AdminTheme.gradient;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient
          id="adminGradient"
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0" stopColor={top} />
          <Stop offset="0.5" stopColor={mid} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#adminGradient)"
      />
    </Svg>
  );
}
