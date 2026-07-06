interface Props {
  size?: number;
  color?: string;
}

// "1c — Grafo-monograma": a minimal graph whose edge traces a "W" silhouette,
// three nodes of different sizes marking hierarchy — from the Weft Logo
// design exploration (variant 1c of 4).
export default function Logo({ size = 20, color = "#4338CA" }: Props) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 100 75" fill="none" aria-hidden="true">
      <path
        d="M 16,20 C 22,46 27,58 34,58 C 40,58 45,40 51,35 C 57,40 62,58 68,58 C 75,58 80,46 86,20"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <circle cx="16" cy="20" r="11" fill={color} />
      <circle cx="51" cy="35" r="8" fill={color} />
      <circle cx="86" cy="20" r="8" fill={color} />
    </svg>
  );
}
