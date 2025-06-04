
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface ChunkedQueryResult {
  data: any[];
  totalProcessed: number;
  isComplete: boolean;
  error?: string;
}

export function useLargeReportOptimization() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const processLargeAdvisorList = useCallback(async (
    advisorIds: string[],
    chunkSize: number = 500
  ): Promise<ChunkedQueryResult> => {
    if (advisorIds.length <= 1000) {
      // Use regular query for smaller lists
      try {
        const { data, error } = await supabase
          .from('advisors')
          .select('*')
          .in('id', advisorIds);

        if (error) throw error;
        
        return {
          data: data || [],
          totalProcessed: advisorIds.length,
          isComplete: true
        };
      } catch (error: any) {
        logger.error('Error in regular query for advisor list', { 
          error: error.message,
          advisorCount: advisorIds.length 
        });
        return {
          data: [],
          totalProcessed: 0,
          isComplete: false,
          error: error.message
        };
      }
    }

    // Process large lists in chunks
    setIsProcessing(true);
    const chunks = [];
    const allData: any[] = [];
    
    for (let i = 0; i < advisorIds.length; i += chunkSize) {
      chunks.push(advisorIds.slice(i, i + chunkSize));
    }

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} advisors`);
        
        const { data, error } = await supabase
          .from('advisors')
          .select('*')
          .in('id', chunk);

        if (error) {
          logger.error('Error processing advisor chunk', { 
            error: error.message,
            chunkIndex: i,
            chunkSize: chunk.length 
          });
          throw error;
        }

        if (data) {
          allData.push(...data);
        }

        // Update progress
        const progressPercent = ((i + 1) / chunks.length) * 100;
        setProgress(progressPercent);
        
        // Small delay to prevent overwhelming the database
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info('Successfully processed large advisor list', {
        totalAdvisors: advisorIds.length,
        chunksProcessed: chunks.length,
        resultCount: allData.length
      });

      return {
        data: allData,
        totalProcessed: advisorIds.length,
        isComplete: true
      };

    } catch (error: any) {
      logger.error('Error processing large advisor list', { 
        error: error.message,
        totalAdvisors: advisorIds.length 
      });
      
      return {
        data: allData, // Return partial data if available
        totalProcessed: allData.length,
        isComplete: false,
        error: error.message
      };
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  return {
    processLargeAdvisorList,
    isProcessing,
    progress
  };
}
