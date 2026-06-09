/* eslint-disable no-undef */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const LEGACY_TO_CANONICAL = {
  '6a272f8976cba10c3232779a': '6a272f8976cba10c3232779a',
  '6a284dac50ab23107b42e146': '6a272f8976cba10c3232779a',
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const dry_run = url.searchParams.get('dry_run') === 'true' || req.method === 'GET';

  try {
    const base44 = createClientFromRequest(req);
    const legacyIds = Object.keys(LEGACY_TO_CANONICAL);
    const affected = [];

    for (const legacyId of legacyIds) {
      const users = await base44.asServiceRole.entities.User
        .filter({ profile_id: legacyId })
        .catch(() => []);
      for (const user of users) {
        affected.push({
          user_id: user.id,
          email: user.email,
          old_profile_id: legacyId,
          new_profile_id: LEGACY_TO_CANONICAL[legacyId],
        });
      }
    }

    if (dry_run) {
      return Response.json({ mode: 'dry_run', users_to_migrate: affected.length, preview: affected });
    }

    const results = { success: 0, failed: 0, errors: [] };
    for (const item of affected) {
      try {
        await base44.asServiceRole.entities.User.update(item.user_id, { profile_id: item.new_profile_id });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`${item.email}: ${err?.message}`);
      }
    }

    return Response.json({
      mode: 'execute',
      users_found: affected.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
      migrated: affected.map(i => ({ email: i.email, new_profile_id: i.new_profile_id })),
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});