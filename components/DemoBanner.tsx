import { isDemo } from "lib/demo";

// Pita di atas dashboard instance demo.
export default function DemoBanner() {
  if (!isDemo()) return null;
  return (
    <div className="border-b border-[#fde68a] bg-[#fffbeb] px-4 py-1.5 text-center text-xs text-[#92400e] dark:border-[#78350f] dark:bg-[#451a03] dark:text-[#fcd34d]">
      You&apos;re in the demo. Anyone can sign in here, so don&apos;t enter real data. Everything resets every
      day at 07:00 WIB (00:00 UTC). Image uploads are off.
    </div>
  );
}
