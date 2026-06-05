import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Apenas admins de OFICINA (têm workshop_id) — plataforma/equipe interna excluídos
    // Preservados: oficinasmastergtr, vitoralbuquerque22, mateus.mtssaraiva, oficinasmasterl,
    //              conorb@base44.com, kfiral@base44.com, elinas@base44.com, shayru@base44.com
    const usersToRemoveAdmin = [
      '699c5f5003b3eb84eb169990', // gerencia@mecanicaspacecar.com.br
      '699757b1bc519532120d71e4', // jhow.willian98@outlook.com
      '6997538b8f8e6635c1f24576', // guimmotorscentroautomotivoremi@gmail.com
      '699744c867e470c70cff05b7', // ricardokuster.k@gmail.com
      '6995f1ba6a8f924761f655cf', // lccentroautomotivo@yahoo.com.br
      '698cd38147e29d070ec24d01', // flademirantunes@hotmail.com
      '698b7906b603c48d4c800763', // paulacrisdfjp@gmail.com
      '6986203c54e67317727b284f', // inovaautoeletrica@yahoo.com.br
      '6984f0e793db8dac55206fa1', // xingumatriz@gmail.com
      '6984d018741fd88b9244bc0b', // katiarodrigues89@yahoo.com.br
      '698380a9a2b69187abe82c8b', // ajbautopecas@gmail.com
      '69837beb915c2a1ec86fa68d', // tarcisioscapneus@hotmail.com
      '6980ac8a85b2d2641655b612', // jessiecastrojcd@gmail.com
      '697c9756c36615c939caf36f', // highway40mecanica@gmail.com
      '697b9f6c6882bd8497a6e150', // tatyselma@gmail.com
      '697b9eba47d130e4b006d751', // mecanicadias@gmail.com
      '697b9dde077084c08e27cce4', // luiz_martins1994@hotmail.com
      '697b99863fa1e03b6f2b27f9', // oficinadejota@gmail.com
      '697b98af5383008c9044d8fb', // luciofreitas53@gmail.com
      '697b9833a0dba46b3f8d8114', // administrativo@molashoracerta.com.br
      '697b97e8d5a8f832ac5cd0b4', // tarcilayago@gmail.com
      '6973ba3b475310a814dbdd9d', // kpneus@gmail.com
      '6973b98162ea8183d11042a9', // maxkopplin@gmail.com
    ];

    const results = [];
    const errors = [];

    for (const userId of usersToRemoveAdmin) {
      try {
        await base44.asServiceRole.entities.User.update(userId, { role: 'user' });
        results.push({ userId, status: 'success' });
      } catch (error) {
        errors.push({ userId, status: 'error', message: error.message });
      }
    }

    return Response.json({
      success: true,
      message: `Concluído: ${results.length} atualizados, ${errors.length} erros`,
      results,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});