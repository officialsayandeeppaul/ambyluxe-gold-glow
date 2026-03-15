-- Update handle_new_user to also set phone from auth.users for phone OTP signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, phone)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'email'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.phone::text, NEW.raw_user_meta_data->>'phone')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile/role already exists (e.g. from OAuth + phone link), ignore
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
