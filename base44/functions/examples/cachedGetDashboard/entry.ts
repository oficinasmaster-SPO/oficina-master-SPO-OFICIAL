// Example: Backend caching pattern for expensive dashboard queries
// Apply to: bffDashboard, calculateRankings, generateReports

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { getOrSet, invalidateCache } from '../lib/backendCache.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cache key: includes user + workshop scope
    const cacheKey = `dashboard:${user.id}:${user.data.workshop_id}`;
    
    // Fetch with caching (5-minute TTL)
    const dashboard = await getOrSet(cacheKey, async () => {
      // Expensive operations here
      const workshops = await base44.entities.Workshop.filter(
        { id: user.data.workshop_id },
        '-updated_date',
        1
      );
      
      const employees = await base44.entities.Employee.filter(
        { workshop_id: user.data.workshop_id },
        '-updated_date',
        100
      );
      
      return {
        workshops: workshops || [],
        employees: employees || [],
        timestamp: new Date().toISOString(),
      };
    }, 1000 * 60 * 5); // 5 minutes cache

    return Response.json(dashboard);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});