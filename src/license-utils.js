// license フィールドを人間可読にまとめる（文字列/オブジェクト/配列に対応）
export function formatLicense(raw) {
  const parts = [];

  const pushMaybe = (v) => {
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  };

  const handleObj = (licObj) => {
    if (!licObj || typeof licObj !== "object") return;
    const type =
      typeof licObj.type === "string" && licObj.type.trim()
        ? licObj.type.trim()
        : "";
    const url =
      typeof licObj.url === "string" && licObj.url.trim()
        ? licObj.url.trim()
        : "";
    if (type && url) {
      parts.push(`${type} (${url})`);
    } else {
      pushMaybe(type);
      pushMaybe(url);
    }
  };

  if (typeof raw === "string") {
    pushMaybe(raw);
  } else if (Array.isArray(raw)) {
    for (const lic of raw) {
      if (typeof lic === "string") pushMaybe(lic);
      else handleObj(lic);
    }
  } else {
    handleObj(raw);
  }

  if (parts.length === 0) return null;
  return [...new Set(parts)].join(" | ");
}
