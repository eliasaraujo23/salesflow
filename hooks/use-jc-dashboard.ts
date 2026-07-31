'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJcDashboardAction } from '@/lib/actions/fetch-jc-dashboard';

export function useJcDashboard() {
  return useQuery({
    queryKey: ['jc-dashboard'],
    queryFn:  fetchJcDashboardAction,
    staleTime: 5 * 60 * 1000,
    select: r => r.data,
  });
}
