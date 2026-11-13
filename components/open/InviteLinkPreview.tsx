import { Platform } from "react-native";
import { usePathname } from "expo-router";
import Head from "expo-router/head";

export const INVITE_PATH = "/open/invite";

const SITE_URL = "https://begifted.vercel.app";
const TITLE = "A friend invited you to BeGifted";
const DESCRIPTION =
  "Your personal gifting concierge. For everyone on your list.";
// Served from public/, so the URL survives bundling; crawlers need it absolute.
const IMAGE_URL = `${SITE_URL}/invite-preview.png`;

// Link-preview tags for invite links shared in Messages. Rendered from the
// root layout above its font gate: the static export renders nothing below
// that gate, so tags placed in the screen never reach open/invite.html.
// vercel.json serves that file for /open/invite; every other path gets
// index.html.
const InviteLinkPreview: React.FC = () => {
  const pathname = usePathname();
  if (Platform.OS !== "web" || pathname !== INVITE_PATH) return null;

  return (
    <Head>
      <title>{TITLE}</title>
      <meta name="description" content={DESCRIPTION} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="BeGifted" />
      <meta property="og:title" content={TITLE} />
      <meta property="og:description" content={DESCRIPTION} />
      <meta property="og:url" content={`${SITE_URL}${INVITE_PATH}`} />
      <meta property="og:image" content={IMAGE_URL} />
      <meta property="og:image:width" content="1024" />
      <meta property="og:image:height" content="1024" />
      <meta name="twitter:card" content="summary" />
    </Head>
  );
};

export default InviteLinkPreview;
