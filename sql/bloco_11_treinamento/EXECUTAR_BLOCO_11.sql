-- ============================================================================
-- EXECUTAR BLOCO 11 — Treinamento / Academia (13 tabelas: 80 a 92)
-- Execute no pgAdmin (Query Tool) — copie/cole cada arquivo na ordem
-- ============================================================================

-- 80, 81 — training_courses, training_course_meta
-- \i '80_81_training_courses.sql'

-- 82, 83 — training_modules, training_lessons
-- \i '82_83_training_modules_lessons.sql'

-- 84, 85 — training_academy_settings, training_academy_settings_meta
-- \i '84_85_training_academy_settings.sql'

-- 86, 87, 88 — training_progress, course_analytics, course_reminders
-- \i '86_87_88_training_progress.sql'

-- 89, 90, 91, 92 — lesson_assessments, lesson_assessment_results,
--                    lesson_content_history, sales_trainings
-- \i '89_90_91_92_assessments_sales.sql'

-- ============================================================================
-- VERIFICAÇÃO: contar tabelas criadas neste bloco
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'training_courses', 'training_course_meta',
    'training_modules', 'training_lessons',
    'training_academy_settings', 'training_academy_settings_meta',
    'training_progress', 'course_analytics', 'course_reminders',
    'lesson_assessments', 'lesson_assessment_results',
    'lesson_content_history', 'sales_trainings'
  )
ORDER BY table_name;
