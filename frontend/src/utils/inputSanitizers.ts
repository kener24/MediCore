import type { FormEvent } from "react";

export const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

export const onlyPhoneChars = (value?: string | null) => String(value ?? "").replace(/[^0-9+()\-\s]/g, "");

export function cleanDecimal(value?: string | null, decimals = 2) {
  const raw = String(value ?? "").replace(",", ".").replace(/[^\d.]/g, "");
  const [integer, ...rest] = raw.split(".");
  const fraction = rest.join("").slice(0, decimals);
  return fraction || raw.includes(".") ? `${integer}.${fraction}` : integer;
}

function sanitizeInput(event: FormEvent<HTMLInputElement>, sanitizer: (value: string) => string) {
  const next = sanitizer(event.currentTarget.value);
  if (event.currentTarget.value !== next) event.currentTarget.value = next;
}

export const digitInputProps = {
  inputMode: "numeric" as const,
  pattern: "[0-9]*",
  onInput: (event: FormEvent<HTMLInputElement>) => sanitizeInput(event, onlyDigits),
};

export const phoneInputProps = {
  inputMode: "tel" as const,
  pattern: "[0-9+()\\-\\s]*",
  onInput: (event: FormEvent<HTMLInputElement>) => sanitizeInput(event, onlyPhoneChars),
};

export function decimalInputProps(decimals = 2) {
  return {
    inputMode: "decimal" as const,
    pattern: decimals > 0 ? `\\d+(\\.\\d{0,${decimals}})?` : "\\d+",
    onInput: (event: FormEvent<HTMLInputElement>) => sanitizeInput(event, (value) => cleanDecimal(value, decimals)),
  };
}
