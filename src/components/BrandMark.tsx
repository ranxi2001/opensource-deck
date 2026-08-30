interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = "brand-mark" }: BrandMarkProps) {
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}brand-mark.png`}
      width="34"
      height="34"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  );
}
