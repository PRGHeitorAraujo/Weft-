import { useState } from "react";

interface Props {
  title: string;
  coverUrl: string | null;
  width: number;
  height: number;
  fontSize: number;
  radius?: number;
}

export default function BookCover({ title, coverUrl, width, height, fontSize, radius = 4 }: Props) {
  const [failed, setFailed] = useState(false);

  if (coverUrl && !failed) {
    return (
      <img
        src={coverUrl}
        alt={title}
        onError={() => setFailed(true)}
        style={{ width, height, flexShrink: 0, borderRadius: radius, objectFit: "cover", background: "#26232E" }}
      />
    );
  }

  return (
    <div style={{ width, height, flexShrink: 0, borderRadius: radius, background: "#26232E", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "var(--prose)", fontSize, color: "#D6D2E8", fontStyle: "italic" }}>{title[0]}</span>
    </div>
  );
}
