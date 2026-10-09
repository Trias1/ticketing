"use client";

import clsx from "clsx";
import { Check, X } from "lucide-react";
import { checkPassword, type PasswordContext } from "lib/password-policy";

const BAR_COLORS = ["bg-tk-red", "bg-tk-red", "bg-tk-orange", "bg-tk-green", "bg-tk-green"];
const TEXT_COLORS = [
  "text-tk-red dark:text-[#fca5a5]",
  "text-tk-red dark:text-[#fca5a5]",
  "text-tk-orange dark:text-[#fcd34d]",
  "text-tk-green dark:text-[#86efac]",
  "text-tk-green dark:text-[#86efac]",
];

// Indikator kekuatan + daftar aturan, memakai aturan yang sama dengan server (lib/password-policy).
export default function PasswordStrength({ password, context }: { password: string; context?: PasswordContext }) {
  if (!password) return null;
  const result = checkPassword(password, context);

  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={clsx(
                "h-1.5 flex-1 rounded-full",
                i <= Math.max(result.score, 1) ? BAR_COLORS[result.score] : "bg-tk-border dark:bg-tk-dark-border"
              )}
            />
          ))}
        </div>
        <span className={clsx("w-16 text-right text-xs font-medium", TEXT_COLORS[result.score])}>{result.label}</span>
      </div>
      <ul className="space-y-1">
        {result.rules.map((rule) => (
          <li
            key={rule.id}
            className={clsx(
              "flex items-start gap-1.5 text-xs",
              rule.met ? "text-tk-muted dark:text-tk-dark-muted" : "text-tk-text dark:text-tk-dark-text"
            )}
          >
            {rule.met ? (
              <Check className="mt-px h-3.5 w-3.5 shrink-0 text-tk-green dark:text-[#86efac]" />
            ) : (
              <X className="mt-px h-3.5 w-3.5 shrink-0 text-tk-faint" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
