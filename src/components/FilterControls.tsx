
import { useState, useCallback, useEffect } from 'react';
import { FilterDropdown } from './FilterDropdown';
import { useDebouncedCascadingFilters } from './FilterControls/useDebouncedCascadingFilters';
import { FilterControlsProps } from './FilterControls/types';

interface ExtendedFilterControlsProps extends FilterControlsProps {
  resetTrigger?: number;
}

export function FilterControls({ 
  filterOptions, 
  localFilters, 
  onFilterChange, 
  onClearCategory,
  resetTrigger
}: ExtendedFilterControlsProps) {
  // Track committed filters separately - only update when dropdowns close
  const [committedFilters, setCommittedFilters] = useState(localFilters);
  
  // Use committed filters for cascading filters to prevent immediate RPC calls
  const { data: cascadingData, isLoading } = useDebouncedCascadingFilters(committedFilters);

  // Reset committed filters when resetTrigger changes (from Clear All)
  useEffect(() => {
    if (resetTrigger !== undefined) {
      const emptyFilters = {
        provinces: [],
        cities: [],
        firms: [],
        branches: [],
        teams: [],
        favoriteLists: [],
        reports: []
      };
      setCommittedFilters(emptyFilters);
    }
  }, [resetTrigger]);

  // Handle dropdown close - commit the current local filters
  const handleDropdownClose = useCallback((category: keyof typeof localFilters) => {
    setCommittedFilters(prev => ({
      ...prev,
      [category]: localFilters[category]
    }));
  }, [localFilters]);

  // Convert favorite lists to strings for the dropdown - use names as display and values
  const favoriteListOptions = filterOptions.favoriteLists.map(list => list.name);
  
  // Convert reports to strings for the dropdown - use names as display and values  
  const reportOptions = filterOptions.reports.map(report => report.name);

  // Always use ALL original options for multi-select capability
  // The cascading data just tells us what has available results
  const currentOptions = {
    provinces: filterOptions.provinces,
    cities: filterOptions.cities,
    firms: filterOptions.firms,
    branches: filterOptions.branches,
    teams: filterOptions.teams
  };

  return (
    <div className="space-y-4">
      {/* Show loading indicator when cascading filters are updating */}
      {isLoading && (
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-slate-400"></div>
          Updating filter options...
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
        <FilterDropdown
          title="Province"
          options={currentOptions.provinces}
          selectedValues={localFilters.provinces}
          availableOptions={cascadingData?.availableProvinces ? Array.from(cascadingData.availableProvinces) : undefined}
          onValueChange={(value) => onFilterChange('provinces', value)}
          onClearCategory={() => onClearCategory('provinces')}
          onDropdownClose={() => handleDropdownClose('provinces')}
        />
        <FilterDropdown
          title="City"
          options={currentOptions.cities}
          selectedValues={localFilters.cities}
          availableOptions={cascadingData?.availableCities ? Array.from(cascadingData.availableCities) : undefined}
          onValueChange={(value) => onFilterChange('cities', value)}
          onClearCategory={() => onClearCategory('cities')}
          onDropdownClose={() => handleDropdownClose('cities')}
        />
        <FilterDropdown
          title="Firm"
          options={currentOptions.firms}
          selectedValues={localFilters.firms}
          availableOptions={cascadingData?.availableFirms ? Array.from(cascadingData.availableFirms) : undefined}
          onValueChange={(value) => onFilterChange('firms', value)}
          onClearCategory={() => onClearCategory('firms')}
          onDropdownClose={() => handleDropdownClose('firms')}
        />
        <FilterDropdown
          title="Branch"
          options={currentOptions.branches}
          selectedValues={localFilters.branches}
          availableOptions={cascadingData?.availableBranches ? Array.from(cascadingData.availableBranches) : undefined}
          onValueChange={(value) => onFilterChange('branches', value)}
          onClearCategory={() => onClearCategory('branches')}
          onDropdownClose={() => handleDropdownClose('branches')}
        />
        <FilterDropdown
          title="Team"
          options={currentOptions.teams}
          selectedValues={localFilters.teams}
          availableOptions={cascadingData?.availableTeams ? Array.from(cascadingData.availableTeams) : undefined}
          onValueChange={(value) => onFilterChange('teams', value)}
          onClearCategory={() => onClearCategory('teams')}
          onDropdownClose={() => handleDropdownClose('teams')}
        />
        <FilterDropdown
          title="Favorite List"
          options={favoriteListOptions}
          selectedValues={localFilters.favoriteLists}
          onValueChange={(value) => onFilterChange('favoriteLists', value)}
          onClearCategory={() => onClearCategory('favoriteLists')}
          onDropdownClose={() => handleDropdownClose('favoriteLists')}
        />
        <FilterDropdown
          title="Report"
          options={reportOptions}
          selectedValues={localFilters.reports}
          onValueChange={(value) => onFilterChange('reports', value)}
          onClearCategory={() => onClearCategory('reports')}
          onDropdownClose={() => handleDropdownClose('reports')}
        />
      </div>
    </div>
  );
}
