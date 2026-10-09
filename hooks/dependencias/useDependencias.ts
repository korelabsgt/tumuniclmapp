'use client';

import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Database } from '@/lib/database.types';

type Dependencia = Database['public']['Tables']['dependencias']['Row'];

const FIVE_MINUTES = 1000 * 60 * 5;

const KEYS = {
  dependencias: ['dependencias'],
};

export function useDependencias() {
  
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: KEYS.dependencias,
    
    queryFn: async (): Promise<Dependencia[]> => {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('dependencias')
        .select('*')
        .order('no', { ascending: true });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data || [];
    },
    
    staleTime: FIVE_MINUTES,
  });
  
  return {
    dependencias: data ?? [],
    loading: isLoading,
    error,
    mutate: refetch, 
  };
}