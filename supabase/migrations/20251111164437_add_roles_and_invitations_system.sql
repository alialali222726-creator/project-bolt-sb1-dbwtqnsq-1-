/*
  # إضافة نظام الأدوار والدعوات الشامل

  ## الأدوار الجديدة
  
  1. حجام/ـة (cupper)
    - يمكنه/ـها مشاهدة الأمراض المزمنة والقيم الطبيعية
    - يمكنه/ـها إرسال طلبات لإيقاف الأدوية للطبيب المسؤول
    - لا يمكنه/ـها إضافة أو تعديل الأدوية
  
  2. متحجّم/ـة (patient_getting_cupping)
    - دور خاص للمريض الذي يريد الحجامة
  
  ## الجداول الجديدة
  
  1. invitations
    - دعوات المرافقين عبر رقم الجوال
    - حالة الدعوة (معلقة/مقبولة/مرفوضة)
  
  2. cupping_medication_requests
    - طلبات إيقاف الأدوية من الحجام للطبيب
    - ملاحظات قبل وبعد الحجامة
    - المدة المطلوبة (ساعات/أيام)
  
  3. medical_reference_ranges
    - النطاقات والقيم الطبيعية للحالات الطبية
  
  ## التعديلات على الجداول الموجودة
  
  - تحديث قيود دور profiles لتشمل الأدوار الجديدة
  - إضافة phone_number لـ profiles
  - تحديث صلاحيات RLS حسب الأدوار
*/

-- تحديث قيود دور profiles لإضافة الأدوار الجديدة
DO $$
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('doctor', 'primary_caregiver', 'backup_caregiver', 'patient', 'cupper', 'patient_getting_cupping'));
END $$;

-- إضافة رقم الجوال
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;
END $$;

-- جدول القيم الطبيعية والنطاقات الطبية
CREATE TABLE IF NOT EXISTS medical_reference_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_name text NOT NULL,
  parameter_name text NOT NULL,
  min_value decimal,
  max_value decimal,
  unit text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- جدول الدعوات
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  role text NOT NULL CHECK (role IN ('primary_caregiver', 'backup_caregiver', 'cupper')),
  role_description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  invited_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- جدول طلبات إيقاف الأدوية للحجامة
CREATE TABLE IF NOT EXISTS cupping_medication_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cupper_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('pause', 'adjust')),
  duration_hours integer,
  duration_days integer,
  notes_before text DEFAULT '',
  notes_after text DEFAULT '',
  cupping_date timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  doctor_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إضافة indexes
CREATE INDEX IF NOT EXISTS idx_invitations_phone ON invitations(phone_number);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_patient ON invitations(patient_id);
CREATE INDEX IF NOT EXISTS idx_cupping_requests_status ON cupping_medication_requests(status);
CREATE INDEX IF NOT EXISTS idx_cupping_requests_doctor ON cupping_medication_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_cupping_requests_patient ON cupping_medication_requests(patient_id);

-- Triggers للتحديث التلقائي
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
  CREATE TRIGGER update_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
  DROP TRIGGER IF EXISTS update_cupping_requests_updated_at ON cupping_medication_requests;
  CREATE TRIGGER update_cupping_requests_updated_at
    BEFORE UPDATE ON cupping_medication_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
END $$;

-- تفعيل RLS
ALTER TABLE medical_reference_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cupping_medication_requests ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للقيم الطبيعية (قراءة للجميع)
CREATE POLICY "Anyone can view medical reference ranges"
  ON medical_reference_ranges FOR SELECT
  TO authenticated
  USING (true);

-- سياسات RLS للدعوات
CREATE POLICY "Users can view their own invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = inviter_id OR 
    auth.uid() = invited_user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.phone_number = invitations.phone_number
    )
  );

CREATE POLICY "Users can create invitations for their patients"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = inviter_id AND
    EXISTS (
      SELECT 1 FROM patient_team
      WHERE patient_team.patient_id = invitations.patient_id
      AND patient_team.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update invitations they received"
  ON invitations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = invited_user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.phone_number = invitations.phone_number
    )
  )
  WITH CHECK (
    auth.uid() = invited_user_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.phone_number = invitations.phone_number
    )
  );

-- سياسات RLS لطلبات الحجامة
CREATE POLICY "Cuppers can view their own requests"
  ON cupping_medication_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = cupper_id);

CREATE POLICY "Doctors can view requests for their patients"
  ON cupping_medication_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can view their cupping requests"
  ON cupping_medication_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = cupping_medication_requests.patient_id
      AND patients.created_by = auth.uid()
    )
  );

CREATE POLICY "Cuppers can create requests"
  ON cupping_medication_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = cupper_id AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'cupper'
    )
  );

CREATE POLICY "Doctors can update requests for their patients"
  ON cupping_medication_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Cuppers can update their own requests"
  ON cupping_medication_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = cupper_id)
  WITH CHECK (auth.uid() = cupper_id);

-- إدراج بعض القيم الطبيعية الأساسية
INSERT INTO medical_reference_ranges (condition_name, parameter_name, min_value, max_value, unit, description) VALUES
  ('السكري', 'سكر الصائم', 70, 100, 'mg/dL', 'المعدل الطبيعي لسكر الدم صائم'),
  ('السكري', 'سكر بعد الأكل', 70, 140, 'mg/dL', 'المعدل الطبيعي لسكر الدم بعد ساعتين من الأكل'),
  ('ضغط الدم', 'الضغط الانقباضي', 90, 120, 'mmHg', 'ضغط الدم العلوي'),
  ('ضغط الدم', 'الضغط الانبساطي', 60, 80, 'mmHg', 'ضغط الدم السفلي'),
  ('الكوليسترول', 'الكوليسترول الكلي', 0, 200, 'mg/dL', 'المعدل الطبيعي للكوليسترول'),
  ('الكوليسترول', 'LDL', 0, 100, 'mg/dL', 'الكوليسترول الضار'),
  ('الكوليسترول', 'HDL', 40, 999, 'mg/dL', 'الكوليسترول النافع')
ON CONFLICT DO NOTHING;
