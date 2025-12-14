"use client";

import { useState } from "react";
import Image from "next/image";

interface CompanyLogoProps {
  domain: string;
  logoType?: 'logo' | 'symbol' | 'icon';
}

export function CompanyLogo({ domain, logoType }: CompanyLogoProps) {
  const [error, setError] = useState(false);

  // Brandfetch Logo Link API
  const clientId = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID;
  const typePath = logoType ? `/${logoType}` : '';
  const logoUrl = clientId
    ? `https://cdn.brandfetch.io/${domain}${typePath}?c=${clientId}`
    : `https://cdn.brandfetch.io/${domain}${typePath}`;

  if (error) {
    return null;
  }

  return (
    <div className="absolute bottom-3 right-3">
      <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden">
        <Image
          src={logoUrl}
          alt={domain}
          width={48}
          height={48}
          sizes="48px"
          className="w-12 h-12 object-cover"
          unoptimized
          onError={() => setError(true)}
        />
      </div>
    </div>
  );
}
