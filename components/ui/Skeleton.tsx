'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function SkeletonBase({ 
  className = '', 
  variant = 'text', 
  width, 
  height,
}: Omit<SkeletonProps, 'lines'>) {
  const baseClasses = 'shimmer';
  
  const variantClasses = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-2xl',
  };

  const defaultSizes = {
    text: { width: '100%', height: '14px' },
    circular: { width: '40px', height: '40px' },
    rectangular: { width: '100%', height: '100px' },
    rounded: { width: '100%', height: '100px' },
  };

  const style: React.CSSProperties = {
    width: width || defaultSizes[variant].width,
    height: height || defaultSizes[variant].height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
      role="presentation"
    />
  );
}

/** Multi-line skeleton text block */
function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true" role="presentation">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase 
          key={i} 
          variant="text" 
          width={i === lines - 1 ? '60%' : '100%'} 
          height="12px" 
        />
      ))}
    </div>
  );
}

/** Dashboard KPI card skeleton */
function SkeletonKpiCard() {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1">
          <SkeletonBase variant="text" width="50%" height="10px" />
          <SkeletonBase variant="text" width="40%" height="28px" />
          <SkeletonBase variant="text" width="70%" height="10px" />
        </div>
        <SkeletonBase variant="rounded" width="44px" height="44px" />
      </div>
    </div>
  );
}

/** Chart area skeleton */
function SkeletonChart() {
  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm" aria-hidden="true">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <SkeletonBase variant="text" width="200px" height="18px" />
          <SkeletonBase variant="text" width="280px" height="11px" />
        </div>
        <div className="flex gap-3">
          <SkeletonBase variant="rounded" width="80px" height="18px" />
          <SkeletonBase variant="rounded" width="80px" height="18px" />
        </div>
      </div>
      <div className="h-48 sm:h-64 flex items-end gap-3 px-4">
        {[60, 85, 45, 92, 70, 55, 78].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <SkeletonBase variant="rounded" width="100%" height={`${h}%`} />
            <SkeletonBase variant="text" width="70%" height="10px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table row skeleton */
function SkeletonTableRow() {
  return (
    <div className="py-3.5 flex items-center justify-between gap-4 px-2" aria-hidden="true">
      <div className="space-y-2 flex-1">
        <SkeletonBase variant="text" width="45%" height="14px" />
        <SkeletonBase variant="text" width="70%" height="10px" />
      </div>
      <div className="flex gap-4">
        <SkeletonBase variant="text" width="60px" height="14px" />
        <SkeletonBase variant="text" width="40px" height="14px" />
        <SkeletonBase variant="text" width="40px" height="14px" />
      </div>
    </div>
  );
}

/** Full dashboard loading skeleton */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Veriler yükleniyor" role="status">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div className="space-y-2">
          <SkeletonBase variant="text" width="280px" height="24px" />
          <SkeletonBase variant="text" width="400px" height="12px" />
        </div>
        <SkeletonBase variant="rounded" width="190px" height="40px" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
      </div>

      {/* Chart + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonChart />
        </div>
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-black shadow-xl">
          <div className="space-y-4">
            <SkeletonBase variant="text" width="60%" height="12px" className="!bg-zinc-700" />
            <SkeletonBase variant="text" width="80%" height="18px" className="!bg-zinc-700" />
            <SkeletonBase variant="text" width="100%" height="10px" className="!bg-zinc-800" />
            <SkeletonBase variant="text" width="90%" height="10px" className="!bg-zinc-800" />
          </div>
          <div className="mt-8">
            <SkeletonBase variant="rounded" width="100%" height="40px" className="!bg-zinc-700" />
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <SkeletonBase variant="text" width="200px" height="18px" />
          <SkeletonBase variant="text" width="80px" height="12px" />
        </div>
        <div className="divide-y divide-gray-100">
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
        </div>
      </div>

      <span className="sr-only">Veriler yükleniyor, lütfen bekleyin...</span>
    </div>
  );
}

/** Generic page-level skeleton for other views */
export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-6" aria-label={title || 'Sayfa yükleniyor'} role="status">
      <div className="space-y-2 border-b border-gray-100 pb-4">
        <SkeletonBase variant="text" width="250px" height="24px" />
        <SkeletonBase variant="text" width="380px" height="12px" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonBase variant="rounded" height="200px" />
        <SkeletonBase variant="rounded" height="200px" />
      </div>
      <SkeletonBase variant="rounded" height="300px" />
      <span className="sr-only">{title || 'Sayfa'} yükleniyor, lütfen bekleyin...</span>
    </div>
  );
}

export { SkeletonBase as Skeleton, SkeletonText, SkeletonKpiCard, SkeletonChart, SkeletonTableRow };
export default SkeletonBase;
