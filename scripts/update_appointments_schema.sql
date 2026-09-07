-- ==============================================================================
-- Procare Console - Appointments Management Schema Update
-- Table: appointments
-- Description: Adds 'status' and 'notes' columns with constraints, indexing,
-- and automated 'no-show' status evaluation function.
-- ==============================================================================

-- 1. Add 'status' column with default 'pending' and validation check constraint
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'confirmed', 'visited', 'canceled', 'no_show'));

-- 2. Add 'notes' column for optional administrator remarks
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- 3. Create indexes for high-speed querying and filtering
CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_date_time 
ON public.appointments(appointment_date, start_time);

-- 4. Enable Row Level Security (RLS) if not already enabled
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for authenticated admin updates
DROP POLICY IF EXISTS "Allow authenticated admin full access on appointments" ON public.appointments;
CREATE POLICY "Allow authenticated admin full access on appointments"
ON public.appointments
FOR ALL
USING (true)
WITH CHECK (true);

-- 6. Automated Stored Procedure for 'No-Show' Time-based Evaluation
-- Updates any pending or confirmed appointment whose scheduled date/time has passed.
CREATE OR REPLACE FUNCTION public.sync_appointments_no_show()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.appointments
    SET status = 'no_show'
    WHERE status IN ('pending', 'confirmed')
      AND (
          appointment_date < CURRENT_DATE
          OR (
              appointment_date = CURRENT_DATE 
              AND (
                  CASE 
                      WHEN start_time IS NOT NULL AND start_time != '' 
                      THEN (start_time::time < (CURRENT_TIME AT TIME ZONE 'Asia/Kolkata')::time)
                      ELSE true 
                  END
              )
          )
      );
END;
$$;

-- 7. Execute initial sync to update any existing past appointments to 'no_show'
SELECT public.sync_appointments_no_show();
