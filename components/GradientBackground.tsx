import { useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

/**
 * Global gradient background using react-native-svg.
 * Equivalent to:
 *   radial-gradient(50% 40% at 20% 60%, #ac8b3f 0%, transparent 100%),
 *   linear-gradient(342deg, #432013 0%, #5d8997 40%, #ebdfbd 100%)
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
        {/* linear-gradient(342deg, #432013 0%, #5d8997 40%, #ebdfbd 100%) */}
        <LinearGradient
          id="mainGradient"
          x1="65%"
          y1="98%"
          x2="35%"
          y2="2%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0" stopColor="#432013" />
          <Stop offset="0.4" stopColor="#5d8997" />
          <Stop offset="1" stopColor="#ebdfbd" />
        </LinearGradient>
        {/* radial-gradient(50% 40% at 20% 60%, #ac8b3f 0%, #073AFF00 100%) */}
        <RadialGradient
          id="goldOverlay"
          cx="20%"
          cy="60%"
          rx="50%"
          ry="40%"
          fx="20%"
          fy="60%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0" stopColor="#ac8b3f" />
          <Stop offset="1" stopColor="#073AFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#mainGradient)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#goldOverlay)" />
    </Svg>
  );
}
