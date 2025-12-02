import { Button, ButtonProps } from "./Button";

/**
 * Pre-configured primary button variant
 */
export function PrimaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button {...props} variant="primary" />;
}

/**
 * Pre-configured secondary button variant
 */
export function SecondaryButton(props: Omit<ButtonProps, "variant">) {
  return <Button {...props} variant="secondary" />;
}

/**
 * Pre-configured text button variant
 */
export function TextButton(props: Omit<ButtonProps, "variant">) {
  return <Button {...props} variant="text" />;
}

