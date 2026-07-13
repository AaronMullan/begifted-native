import { StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";

/**
 * Contextual legal notices for the add-recipient surfaces: the Terms require
 * users to have the right to provide recipient info, and beta ships a
 * lightweight adults-only notice instead of age fields or stored consent.
 * Interim light treatment pending the DES-3 design pass — must stay
 * non-blocking.
 */
const AddRecipientLegalNotice: React.FC = () => (
  <Text style={styles.notice}>
    Only add information you have the right to provide. BeGifted is for adults.
    Only add child-recipient information if you are the parent/guardian or
    otherwise have authority.
  </Text>
);

export default AddRecipientLegalNotice;

const styles = StyleSheet.create({
  notice: {
    ...Typography.caption,
    color: Colors.grays.text,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
