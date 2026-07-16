import Image from "next/image";

export function BrandMark({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-foreground ${className}`}
    >
      <Image
        className="block size-9 shrink-0"
        src="/icon.svg"
        alt=""
        width={36}
        height={36}
        unoptimized
        aria-hidden="true"
      />
      <span className="font-sans text-[1.0625rem] leading-none font-semibold tracking-[-0.035em]">
        codebuff
      </span>
    </span>
  );
}
