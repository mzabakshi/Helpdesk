import { Link, type LinkProps } from "react-router";

export default function AppLink({ className = "", ...props }: LinkProps) {
  return (
    <Link
      className={`text-foreground underline-offset-4 hover:underline ${className}`.trim()}
      {...props}
    />
  );
}
