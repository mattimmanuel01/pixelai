-- Update Pro users to have proper quotas (run this when upgrading users to Pro)
-- This is a separate migration for when you implement Stripe payments

-- Function to upgrade user to Pro plan
CREATE OR REPLACE FUNCTION public.upgrade_user_to_pro(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users 
  SET 
    subscription_tier = 'pro',
    upscale_quota = 50,
    expand_quota = 50
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to downgrade user to Free plan (for subscription cancellations)
CREATE OR REPLACE FUNCTION public.downgrade_user_to_free(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users 
  SET 
    subscription_tier = 'free',
    upscale_quota = 0,
    expand_quota = 0
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly quotas (run this monthly via cron)
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS VOID AS $$
BEGIN
  UPDATE public.users 
  SET 
    upscale_used = 0,
    expand_used = 0
  WHERE subscription_tier = 'pro';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION public.upgrade_user_to_pro TO authenticated;
GRANT EXECUTE ON FUNCTION public.downgrade_user_to_free TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_monthly_quotas TO authenticated;