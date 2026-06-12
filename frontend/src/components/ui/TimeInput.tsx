import { Input } from "./Input";

export function TimeInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <Input type="time" {...props} />;
}
