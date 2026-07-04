"use client";
import { useState } from "react";
import NextImage from "next/image";

const DEFAULT_PFP =
  "https://res.cloudinary.com/dkjsi6iwm/image/upload/v1734123569/profile.jpg";

export default function ProfileImage({
  src,
  alt = "Avatar",
  width,
  height,
  fill,
  sizes,
  className,
  style,
  onClick,
  priority,
}) {
  const [imgSrc, setImgSrc] = useState(src || DEFAULT_PFP);

  return (
    <NextImage
      src={imgSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      sizes={sizes}
      className={className}
      style={style}
      onClick={onClick}
      priority={priority}
      onError={() => setImgSrc(DEFAULT_PFP)}
    />
  );
}
