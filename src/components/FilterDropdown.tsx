
import React, { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';

interface FilterDropdownProps {
  title: string;
  options: string[];
  selectedValues: string[];
  availableOptions?: string[];
  onValueChange: (value: string) => void;
  onClearCategory: () => void;
  onDropdownClose?: () => void;
}

export function FilterDropdown({ 
  title, 
  options, 
  selectedValues, 
  availableOptions,
  onValueChange, 
  onClearCategory,
  onDropdownClose
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCount = selectedValues.length;
  
  // Helper function to get proper plural form
  const getPluralForm = (title: string) => {
    if (title === 'City') return 'Cities';
    if (title === 'Branch') return 'Branches';
    return title + 's';
  };
  
  const pluralTitle = getPluralForm(title);
  
  // Only close on outside click, not on selections
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          onDropdownClose?.();
        }
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onDropdownClose]);
  
  // Handle escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        onDropdownClose?.();
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onDropdownClose]);
  
  const handleClearCategory = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onClearCategory();
    setIsOpen(false);
    onDropdownClose?.();
  };
  
  const handleValueToggle = (value: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onValueChange(value);
    // STAY OPEN - don't close dropdown for multi-select
  };
  
  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };
  
  // Manual close button
  const handleManualClose = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(false);
    onDropdownClose?.();
  };
  
  // Filter options to only show those with available data or already selected
  const visibleOptions = options.filter(option => {
    if (selectedValues.includes(option)) return true;
    if (!availableOptions) return true;
    return availableOptions.includes(option);
  });
  
  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label className="text-sm font-semibold text-slate-700">{title}</Label>
      <div className="relative">
        <Button 
          variant="outline" 
          className="w-full justify-between bg-white border-slate-200"
          onClick={handleButtonClick}
        >
          <span className="text-sm text-slate-600">
            {selectedCount > 0 ? `${selectedCount} selected` : `All ${pluralTitle}`}
          </span>
          <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
        
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {/* Header with close button */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-medium text-slate-700">Select {pluralTitle}</span>
              <button
                onClick={handleManualClose}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                Done
              </button>
            </div>
            
            {/* Clear All Option */}
            <div 
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 font-medium border-b border-slate-100"
              onClick={handleClearCategory}
            >
              <div className="flex items-center justify-center w-4 h-4 border border-gray-300 rounded-sm bg-white">
                {selectedCount === 0 && <Check className="w-3 h-3 text-blue-600" />}
              </div>
              All {pluralTitle}
            </div>
            
            {/* Individual Options */}
            {visibleOptions.map((option) => {
              const isSelected = selectedValues.includes(option);
              const isAvailable = !availableOptions || availableOptions.includes(option) || isSelected;
              
              return (
                <div
                  key={option}
                  className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${
                    !isAvailable ? 'opacity-50' : ''
                  }`}
                  onClick={(e) => handleValueToggle(option, e)}
                >
                  <div className="flex items-center justify-center w-4 h-4 border border-gray-300 rounded-sm bg-white">
                    {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                  </div>
                  <span className="text-slate-900">{option}</span>
                </div>
              );
            })}
            
            {visibleOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500 text-center">
                No options available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
