"use client";

import { useState } from "react";
import Image from "next/image";
import { NewsItem } from '@/types';
import { getCategoryColor } from '@/utils';
import { CategoryIcon } from '@/components/common';
import { CompanyLogo } from './CompanyLogo';

interface NewsCardProps {
  news: NewsItem;
}

export function NewsCard({ news }: NewsCardProps) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const getFlagUrl = (countryCode: string) => {
    return `https://hatscripts.github.io/circle-flags/flags/${countryCode}.svg`;
  };

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full group">
      {/* Thumbnail Image */}
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <Image
          src={news.imageUrl}
          alt={news.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Category Badge on Image */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getCategoryColor(news.category)}`}>
            <CategoryIcon type={news.categoryIcon} />
            {news.category}
          </span>
        </div>
        {/* Badge: Flag for institution, Logo for company */}
        {news.type === 'institution' && news.countryCode ? (
          <div className="absolute bottom-3 right-3">
            <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden">
              <Image
                src={getFlagUrl(news.countryCode)}
                alt={news.countryFlag}
                width={48}
                height={48}
                className="w-12 h-12 object-cover"
                unoptimized
              />
            </div>
          </div>
        ) : news.type === 'company' && news.companyDomain ? (
          <CompanyLogo domain={news.companyDomain} logoType={news.companyLogoType} />
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400">{news.time} · {news.countryFlag} {news.source}</span>
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-gray-900 mb-2 leading-snug line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors">
          {news.title}
        </h2>

        {/* Tags */}
        <div className="flex items-center gap-2 mb-2">
          {news.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs text-blue-500 hover:text-blue-600 cursor-pointer">
              {tag}
            </span>
          ))}
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 flex-1">
          {news.summary}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3">
            {/* Like */}
            <button
              onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1 text-xs ${liked ? "text-red-500" : "text-gray-400"} hover:text-red-500 transition-colors`}
            >
              <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{liked ? news.likes + 1 : news.likes}</span>
            </button>

            {/* Comments */}
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{news.comments}</span>
            </button>

            {/* Views */}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{news.views.toLocaleString()}</span>
            </span>
          </div>

          {/* Bookmark */}
          <button
            onClick={() => setBookmarked(!bookmarked)}
            className={`${bookmarked ? "text-blue-500" : "text-gray-400"} hover:text-blue-500 transition-colors`}
          >
            <svg className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
