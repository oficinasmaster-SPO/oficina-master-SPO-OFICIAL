import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { survey_id, responses, comments } = await req.json();

    if (!survey_id || !responses) {
        return Response.json({ error: 'Missing data' }, { status: 400 });
    }

    // Use service role to update entity as this is a public endpoint
    const survey = await base44.asServiceRole.entities.CompanyClimate.get(survey_id);
    if (!survey) return Response.json({ error: 'Survey not found' }, { status: 404 });

    if (survey.status !== 'aberta') {
        return Response.json({ error: 'Survey is closed' }, { status: 400 });
    }

    // Calculate average for this response
    const dimensionKeys = Object.keys(responses);
    let responseSum = 0;
    let responseCount = 0;
    
    dimensionKeys.forEach(key => {
        responseSum += (responses[key].score || 0);
        responseCount++;
    });
    
    // Add new response
    const newResponse = {
        response_id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        responses,
        comments,
        anonymous: true
    };

    const allResponses = [...(survey.employee_responses || []), newResponse];

    // Recalculate global averages
    const dimensions = { ...survey.dimensions }; // Clone existing dimensions structure
    
    // Initialize dimensions if they don't exist or reset scores for recalculation
    const dimKeys = ["leadership", "communication", "recognition", "development", "work_environment", "compensation"];
    const tempSums = {};
    const tempCounts = {};

    dimKeys.forEach(key => {
        tempSums[key] = 0;
        tempCounts[key] = 0;
    });

    allResponses.forEach(resp => {
        dimKeys.forEach(key => {
            if (resp.responses[key]) {
                tempSums[key] += (resp.responses[key].score || 0);
                tempCounts[key]++;
            }
        });
    });

    // Update dimension scores
    dimKeys.forEach(key => {
        if (!dimensions[key]) dimensions[key] = { score: 0, feedback: "" };
        dimensions[key].score = tempCounts[key] > 0 ? tempSums[key] / tempCounts[key] : 0;
    });

    // Calculate global overall score
    let totalSum = 0;
    let totalCount = 0;
    dimKeys.forEach(key => {
        totalSum += dimensions[key].score;
        totalCount++;
    });
    const overall_score = totalCount > 0 ? totalSum / totalCount : 0;

    // Update entity
    await base44.asServiceRole.entities.CompanyClimate.update(survey_id, {
        employee_responses: allResponses,
        dimensions,
        overall_score,
        participation_rate: allResponses.length // Just count for now, percentage requires total employees
    });

    return Response.json({ success: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});