import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import IntroSlide from "./IntroSlide";
import IntroFooter from "./IntroFooter";
import SignUpSlide from "./SignUpSlide";
import { Colors } from "../../lib/colors";

const SLIDE_IMAGES = {
  slide1Left: require("../../assets/images/intro/slide-1-left.jpg"),
  slide1Right: require("../../assets/images/intro/slide-1-right.jpg"),
  slide2Left: require("../../assets/images/intro/slide-2-left.jpg"),
  slide2Right: require("../../assets/images/intro/slide-2-right.png"),
  slide3: require("../../assets/images/intro/slide-3.jpg"),
};

const TOTAL_SLIDES = 4;
const INTRO_SLIDES = 3; // dots only render on intro slides 1-3

type IntroSwiperProps = {
  onSignUpSuccess: () => Promise<void> | void;
  onGoToSignIn: () => Promise<void> | void;
};

type SlideItem = { id: string };

const SLIDES: SlideItem[] = [
  { id: "people" },
  { id: "thoughtful" },
  { id: "details" },
  { id: "signup" },
];

export default function IntroSwiper({
  onSignUpSuccess,
  onGoToSignIn,
}: IntroSwiperProps) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<SlideItem>>(null);
  const [index, setIndex] = useState(0);

  function scrollTo(i: number) {
    const target = Math.max(0, Math.min(i, TOTAL_SLIDES - 1));
    listRef.current?.scrollToIndex({ index: target, animated: true });
    setIndex(target);
  }

  function handleNext() {
    scrollTo(index + 1);
  }

  function handleSkip() {
    // Skip jumps to the sign-up slide regardless of position.
    scrollTo(TOTAL_SLIDES - 1);
  }

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  }

  function renderItem({ item }: { item: SlideItem }) {
    if (item.id === "signup") {
      return (
        <SignUpSlide
          onSignUpSuccess={onSignUpSuccess}
          onGoToSignIn={onGoToSignIn}
        />
      );
    }

    return (
      <IntroSlide
        headline={getHeadline(item.id)}
        headlineLayout={item.id === "thoughtful" ? "below" : "above"}
        imageSlot={renderImageSlot(item.id)}
        footerSlot={
          <IntroFooter
            totalSlides={INTRO_SLIDES}
            currentIndex={Math.min(index, INTRO_SLIDES - 1)}
            onSkip={handleSkip}
            onNext={handleNext}
            showSkip={item.id !== "details"}
            showNext
          />
        }
      />
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={SLIDES}
      renderItem={renderItem}
      keyExtractor={(s) => s.id}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onMomentumScrollEnd={handleMomentumEnd}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      bounces={false}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});

function getHeadline(id: string) {
  switch (id) {
    case "people":
      return "Your people.\nTheir moments.\nJust the right gift.";
    case "thoughtful":
      return "Thoughtful\nbeats\nexpensive.";
    case "details":
      return "BeGifted pays\nattention to the\ndetails, so you\ndon't have to.";
    default:
      return "";
  }
}

function renderImageSlot(id: string) {
  if (id === "people") {
    return (
      <View style={collageStyles.row}>
        <Image
          source={SLIDE_IMAGES.slide1Left}
          style={collageStyles.tile}
          resizeMode="cover"
        />
        <View
          style={[collageStyles.stripe, { backgroundColor: Colors.brand.gold }]}
        />
        <Image
          source={SLIDE_IMAGES.slide1Right}
          style={collageStyles.tile}
          resizeMode="cover"
        />
      </View>
    );
  }
  if (id === "thoughtful") {
    return (
      <View style={collageStyles.row}>
        <Image
          source={SLIDE_IMAGES.slide2Left}
          style={collageStyles.tile}
          resizeMode="cover"
        />
        <View
          style={[collageStyles.stripe, { backgroundColor: Colors.brand.gold }]}
        />
        <Image
          source={SLIDE_IMAGES.slide2Right}
          style={collageStyles.tile}
          resizeMode="cover"
        />
      </View>
    );
  }
  if (id === "details") {
    return (
      <Image
        source={SLIDE_IMAGES.slide3}
        style={collageStyles.fullBleed}
        resizeMode="cover"
      />
    );
  }
  return null;
}

const collageStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    height: 200,
    borderRadius: 4,
    overflow: "hidden",
  },
  tile: {
    flex: 1,
    height: "100%",
  },
  stripe: {
    width: 24,
  },
  fullBleed: {
    width: "100%",
    height: 280,
    borderRadius: 4,
  },
});
