export function BrandMark({
  className = "brand__mark",
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 118 26"
      aria-hidden="true"
      focusable="false"
    >
      <path className="brand__line" d="M9 7 3 13l6 6M21 7l6 6-6 6" />
      <path
        className="brand__line brand__accent-line"
        d="m17 5-5 16"
      />
      <g transform="translate(34)">
        <path
          className="brand__line"
          d="M4 3v13c0 3.6 2.7 6 6.2 6 3.8 0 6.8-2.9 6.8-6.6 0-3.5-2.7-6.4-6.2-6.4H4"
        />
        <path
          className="brand__line"
          d="M26 10v6c0 3.4 2.6 6 6 6s6-2.6 6-6v-6"
        />
        <path
          className="brand__line"
          d="M50 22V8c0-3.3 2.7-6 6-6h4M46 10h11"
        />
        <path
          className="brand__line"
          d="M70 22V8c0-3.3 2.7-6 6-6h4M66 10h11"
        />
        <circle className="brand__node" cx="4" cy="3" r="1.8" />
        <circle className="brand__node" cx="26" cy="10" r="1.8" />
        <circle className="brand__accent-node" cx="80" cy="2" r="1.8" />
      </g>
    </svg>
  );
}
