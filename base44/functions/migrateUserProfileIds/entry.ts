import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LEGACY_TO_CANONICAL = {
  '695a8c3c7877f53d580cd737': '6a272f8ea3fa8dd02ca7350e',
  '695a89716a11dbedf260389c': '6a272f8976cba10c3232779a',
  '695a8d9116b993d3d3962406': '6a272f96bc6eedd434194fcf',
  '695a8e2b54250507b8ba4ef6': '6a272f876b16129b2f5f31be',
  '69593151faf2794306bd2f41': '6a285fc9f76402dd73736656',
  '69bb0fd138e119878d371813': '6a272f876b16129b2f5f31be',
  '69bb0fd16bd2b32e1ea159cb': '6a272f876b16129b2f5f31be',
  '69bb0fe7233c46a7ce71c928': '6a272f876b16129b2f5f31be',
  '69bb0fe83aa1f4afc4dde7d7': '6a285fc9f76402dd73736656',
  '69bb0fe9dd3fb21493a6f80f': '6a272f8976cba10c3232779a',
  '69f216f1ff2a38a5612e8842': '6a272f8a983951dfc5cf3493',
  '695934f31987065493175982': '6a272f876b16129b2f5f31be',
  '695a8cf018126cab162ec3a5': '6a272f8976cba10c3232779a',
  '6a284dac50ab23107b42e146': '6a272f8976cba10c3232779a',
};

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const dry_run = url.searchParams.get('dry_run') === 'true' || req.method === 'GET';

  try {
    const base44 = createClientFromRequest(req);
    const legacyIds = new Set(Object.keys(LEGACY_TO_CANONICAL));

    // FIX: User.profile_id está na raiz do objeto User, não em data.*
    // O SDK não suporta filter() por campos raiz customizados do User.
    // Solução: buscar todos os users e filtrar no código.
    const allUsers = await base44.asServiceRole.entities.User.list();
    const affected = allUsers
      .filter((u) => u.profile_id && legacyIds.has(u.profile_id))
      .map((u) => ({
        user_id: u.id,
        email: u.email,
        old_profile_id: u.profile_id,
        new_profile_id: LEGACY_TO_CANONICAL[u.profile_id],
      }));

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
      migrated: affected.map(i => ({ email: i.email, old: i.old_profile_id, new: i.new_profile_id })),
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});