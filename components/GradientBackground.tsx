import { useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { Colors } from "../lib/colors";

/**
 * Global gradient background using react-native-svg.
 * Matches the design: brown → blue → neutral linear gradient plus a gold radial overlay.
 * Uses SVG gradients to avoid native "Unimplemented component" issues in TestFlight.
 */
export default function GradientBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      <Defs>
        {/* Main linear gradient: brown → blue → neutral, diagonal (0.2,0.6) to (0.8,0.4) */}
        <LinearGradient
          id="mainGradient"
          x1="20%"
          y1="60%"
          x2="80%"
          y2="40%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0" stopColor={Colors.darks.brown} />
          <Stop offset="0.5" stopColor={Colors.blues.medium} />
          <Stop offset="1" stopColor={Colors.neutrals.medium} />
        </LinearGradient>
        {/* Gold radial overlay centered at (0.2, 0.6), fading to transparent */}
        <RadialGradient
          id="goldOverlay"
          cx="20%"
          cy="60%"
          r="80%"
          fx="20%"
          fy="60%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0" stopColor={Colors.yellows.gold} stopOpacity={0.15} />
          <Stop offset="1" stopColor={Colors.yellows.gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#mainGradient)" />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#goldOverlay)"
        opacity={0.6}
      />
    </Svg>
  );
}
