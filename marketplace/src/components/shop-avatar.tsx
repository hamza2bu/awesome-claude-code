export function ShopAvatar({ name, logoUrl, size = 48 }: { name: string; logoUrl: string | null; size?: number }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- logos come from any configured storage host
    <img src={logoUrl} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700" style={{ width: size, height: size }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
