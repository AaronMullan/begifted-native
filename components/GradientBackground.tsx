import { useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Colors } from "../lib/colors";

/**
 * Global page background — vertical cream gradient (top → bottom).
 * Stops mirror Figma "BeGifted light gradient": beige → beigeMid → white.
 */
export default function GradientBackground() {
  const { width, height } = useWindowDimensions();
  const [top, mid, bottom] = Colors.gradients.light;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient
          id="pageGradient"
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0" stopColor={top} />
          <Stop offset="0.75" stopColor={mid} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#pageGradient)"
      />
    </Svg>
  );
}
