import { supabase } from '@/integrations/supabase/client';
import { SelectedFilters } from './types';

// Constants for query optimization
const MAX_IN_CLAUSE_SIZE = 1000;
const CHUNK_SIZE = 500;

export function buildQuery(
  searchQuery: string,
  selectedFilters: SelectedFilters,
  favoriteAdvisorIds: string[] = [],
  reportAdvisorIds: string[] = []
) {
  console.log('🔍 Building query with:', {
    searchQuery,
    selectedFilters,
    favoriteAdvisorIds: favoriteAdvisorIds.length,
    reportAdvisorIds: reportAdvisorIds.length
  });

  let query = supabase
    .from('advisors')
    .select('*');

  // Handle search query
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = searchQuery.trim();
    query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,firm.ilike.%${searchTerm}%`);
  }

  // Handle location filters
  if (selectedFilters.provinces.length > 0) {
    query = query.in('province', selectedFilters.provinces);
  }

  if (selectedFilters.cities.length > 0) {
    query = query.in('city', selectedFilters.cities);
  }

  // Handle firm/branch/team filters
  if (selectedFilters.firms.length > 0) {
    query = query.in('firm', selectedFilters.firms);
  }

  if (selectedFilters.branches.length > 0) {
    query = query.in('branch', selectedFilters.branches);
  }

  if (selectedFilters.teams.length > 0) {
    query = query.in('team_name', selectedFilters.teams);
  }

  // Handle advisor ID filters with chunking for large arrays
  const allAdvisorIds = [...favoriteAdvisorIds, ...reportAdvisorIds];
  const uniqueAdvisorIds = [...new Set(allAdvisorIds)];
  
  console.log('🔍 Combined advisor IDs:', {
    favoriteIds: favoriteAdvisorIds.length,
    reportIds: reportAdvisorIds.length,
    combined: allAdvisorIds.length,
    unique: uniqueAdvisorIds.length
  });

  // IMPORTANT: Check if we have favorite or report filters selected but no advisor IDs
  const hasFavoriteOrReportFilters = selectedFilters.favoriteLists.length > 0 || selectedFilters.reports.length > 0;
  
  if (hasFavoriteOrReportFilters && uniqueAdvisorIds.length === 0) {
    console.log('🚫 Filter applied but no advisor IDs found - returning null query');
    return null;
  }

  // Apply advisor ID filter - FIXED: Don't truncate for large lists
  if (uniqueAdvisorIds.length > 0) {
    if (uniqueAdvisorIds.length > MAX_IN_CLAUSE_SIZE) {
      console.log(`⚠️ Large advisor ID array detected (${uniqueAdvisorIds.length} IDs). Using chunked OR approach...`);
      
      // Split into chunks and use OR conditions
      const chunks = [];
      for (let i = 0; i < uniqueAdvisorIds.length; i += MAX_IN_CLAUSE_SIZE) {
        chunks.push(uniqueAdvisorIds.slice(i, i + MAX_IN_CLAUSE_SIZE));
      }
      
      console.log(`🔧 Split into ${chunks.length} chunks for query optimization`);
      
      // Build OR query with multiple IN clauses
      const orConditions = chunks.map((chunk, index) => {
        console.log(`🔧 Chunk ${index + 1}: ${chunk.length} IDs`);
        return `id.in.(${chunk.join(',')})`;
      }).join(',');
      
      query = query.or(orConditions);
    } else {
      console.log('🔍 Applying advisor ID filter with', uniqueAdvisorIds.length, 'IDs');
      console.log('🔍 First 5 advisor IDs:', uniqueAdvisorIds.slice(0, 5));
      query = query.in('id', uniqueAdvisorIds);
    }
  }

  console.log('✅ Query built successfully');
  return query;
}

// Updated function specifically for count queries - FIXED for large reports
export function buildCountQuery(
  searchQuery: string,
  selectedFilters: SelectedFilters,
  favoriteAdvisorIds: string[] = [],
  reportAdvisorIds: string[] = []
) {
  console.log('🔍 Building count query with:', {
    searchQuery,
    selectedFilters,
    favoriteAdvisorIds: favoriteAdvisorIds.length,
    reportAdvisorIds: reportAdvisorIds.length
  });

  let query = supabase
    .from('advisors')
    .select('id', { count: 'exact', head: true });

  // Handle search query
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = searchQuery.trim();
    query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,firm.ilike.%${searchTerm}%`);
  }

  // Handle location filters
  if (selectedFilters.provinces.length > 0) {
    query = query.in('province', selectedFilters.provinces);
  }

  if (selectedFilters.cities.length > 0) {
    query = query.in('city', selectedFilters.cities);
  }

  // Handle firm/branch/team filters
  if (selectedFilters.firms.length > 0) {
    query = query.in('firm', selectedFilters.firms);
  }

  if (selectedFilters.branches.length > 0) {
    query = query.in('branch', selectedFilters.branches);
  }

  if (selectedFilters.teams.length > 0) {
    query = query.in('team_name', selectedFilters.teams);
  }

  // Handle advisor ID filters
  const allAdvisorIds = [...favoriteAdvisorIds, ...reportAdvisorIds];
  const uniqueAdvisorIds = [...new Set(allAdvisorIds)];
  
  console.log('🔍 Count query - Combined advisor IDs:', {
    favoriteIds: favoriteAdvisorIds.length,
    reportIds: reportAdvisorIds.length,
    combined: allAdvisorIds.length,
    unique: uniqueAdvisorIds.length
  });

  // For count queries, if we have favorite/report filters but no IDs, return query that matches nothing
  const hasFavoriteOrReportFilters = selectedFilters.favoriteLists.length > 0 || selectedFilters.reports.length > 0;
  
  if (hasFavoriteOrReportFilters && uniqueAdvisorIds.length === 0) {
    console.log('🚫 Count query - Filter applied but no advisor IDs found, returning zero-match query');
    return query.eq('id', 'no-match-impossible-id');
  }

  // Apply advisor ID filter - FIXED: Don't truncate for large lists
  if (uniqueAdvisorIds.length > 0) {
    if (uniqueAdvisorIds.length > MAX_IN_CLAUSE_SIZE) {
      console.log(`⚠️ Count query - Large advisor ID array detected (${uniqueAdvisorIds.length} IDs). Using chunked OR approach...`);
      
      // Split into chunks and use OR conditions
      const chunks = [];
      for (let i = 0; i < uniqueAdvisorIds.length; i += MAX_IN_CLAUSE_SIZE) {
        chunks.push(uniqueAdvisorIds.slice(i, i + MAX_IN_CLAUSE_SIZE));
      }
      
      console.log(`🔧 Count query - Split into ${chunks.length} chunks`);
      
      // Build OR query with multiple IN clauses
      const orConditions = chunks.map((chunk, index) => {
        console.log(`🔧 Count query - Chunk ${index + 1}: ${chunk.length} IDs`);
        return `id.in.(${chunk.join(',')})`;
      }).join(',');
      
      query = query.or(orConditions);
    } else {
      console.log('🔍 Count query - Applying advisor ID filter with', uniqueAdvisorIds.length, 'IDs');
      console.log('🔍 Count query - First 5 advisor IDs:', uniqueAdvisorIds.slice(0, 5));
      query = query.in('id', uniqueAdvisorIds);
    }
  }

  console.log('✅ Count query built successfully');
  return query;
}

// Alternative approach for extremely large reports (10,000+ advisors)
export async function buildLargeReportQuery(
  searchQuery: string,
  selectedFilters: SelectedFilters,
  favoriteAdvisorIds: string[] = [],
  reportAdvisorIds: string[] = [],
  chunkSize: number = CHUNK_SIZE
) {
  const allAdvisorIds = [...favoriteAdvisorIds, ...reportAdvisorIds];
  const uniqueAdvisorIds = [...new Set(allAdvisorIds)];

  // For extremely large datasets (>5000), consider using a different approach
  if (uniqueAdvisorIds.length > 5000) {
    console.log(`🚀 Processing extremely large report with ${uniqueAdvisorIds.length} advisors`);
    console.log('💡 Consider implementing server-side filtering or database views for better performance');
    
    // For now, use the chunked approach but warn about performance
    console.warn('⚠️ Large report detected. Consider optimizing with server-side solutions.');
  }

  // Use the regular query builder which now handles large arrays properly
  return buildQuery(searchQuery, selectedFilters, favoriteAdvisorIds, reportAdvisorIds);
}
