import Svg, { Path } from "react-native-svg";

/**
 * Outlined "expand circle" chevron, matching the Figma asset
 * `expand_circle_down` exported at FILL0 (hollow ring, not a filled disc).
 *
 * The design ships two glyphs rather than rotating one: a down-pointing
 * chevron for the collapsed affordance and a distinct up-pointing chevron for
 * the expanded affordance. We inline both vector paths here (the project has no
 * SVG transformer; see BrandMark.tsx for the same approach). `MaterialIcons`
 * only offers the filled disc, which is why this exists.
 */

type ExpandCircleIconProps = {
  /** Chevron direction: "down" = collapsed affordance, "up" = expanded. */
  direction: "up" | "down";
  /** Fill color for the ring + chevron. */
  color: string;
  size?: number;
};

const UP_PATH =
  "M12 8.5L7.5 13L8.925 14.4L12 11.325L15.075 14.4L16.5 13L12 8.5ZM12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.88333 21.2125 8.1C21.7375 9.31667 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31666 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2ZM12 4C9.76667 4 7.875 4.775 6.325 6.325C4.775 7.875 4 9.76666 4 12C4 14.2333 4.775 16.125 6.325 17.675C7.875 19.225 9.76667 20 12 20C14.2333 20 16.125 19.225 17.675 17.675C19.225 16.125 20 14.2333 20 12C20 9.76667 19.225 7.875 17.675 6.325C16.125 4.775 14.2333 4 12 4Z";

const DOWN_PATH =
  "M12 15.5L16.5 11L15.075 9.6L12 12.675L8.925 9.6L7.5 11L12 15.5ZM12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31667 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.88333 21.2125 8.1C21.7375 9.31667 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22ZM12 20C14.2333 20 16.125 19.225 17.675 17.675C19.225 16.125 20 14.2333 20 12C20 9.76667 19.225 7.875 17.675 6.325C16.125 4.775 14.2333 4 12 4C9.76667 4 7.875 4.775 6.325 6.325C4.775 7.875 4 9.76667 4 12C4 14.2333 4.775 16.125 6.325 17.675C7.875 19.225 9.76667 20 12 20Z";

const ExpandCircleIcon: React.FC<ExpandCircleIconProps> = ({
  direction,
  color,
  size = 24,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d={direction === "up" ? UP_PATH : DOWN_PATH} fill={color} />
  </Svg>
);

export default ExpandCircleIcon;
