/*
  # إضافة حقول العمر والجنس للملف التعريفي

  ## التعديلات
  
  - إضافة حقل date_of_birth (تاريخ الميلاد) إلى profiles
  - إضافة حقل gender (الجنس) إلى profiles
  - إضافة constraint للتحقق من قيم gender
  
  ## الملاحظات
  
  - تاريخ الميلاد سيُستخدم لحساب العمر تلقائياً
  - الجنس يجب أن يكون إما 'male' أو 'female'
*/

-- إضافة حقل تاريخ الميلاد
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE profiles ADD COLUMN date_of_birth date;
  END IF;
END $$;

-- إضافة حقل الجنس
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text CHECK (gender IN ('male', 'female'));
  END IF;
END $$;

-- إنشاء دالة لحساب العمر من تاريخ الميلاد
CREATE OR REPLACE FUNCTION calculate_age(birth_date date)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM age(CURRENT_DATE, birth_date))::integer;
END;
$$;
