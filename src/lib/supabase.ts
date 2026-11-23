import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { IS_STAGING_BUILD, IS_ISOLATED_STAGING_TARGET } from '../constants/staging-environment';

const isOwnerDemo = process.env.EXPO_PUBLIC_OWNER_DEMO === 'true';
const supabaseUrl = isOwnerDemo ? 'https://owner-demo.invalid' : process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  isOwnerDemo ? 'owner-demo' : process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL. Add it to your local environment file.'
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add it to your local environment file.'
  );
}

if (!isOwnerDemo && IS_STAGING_BUILD && !IS_ISOLATED_STAGING_TARGET) {
  throw new Error('Staging build requires an isolated Supabase target, never the production project.');
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    ...(isOwnerDemo ? { global: { fetch: async () => { throw new Error('Demo data stays on this device.'); } } } : {}),
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: !isOwnerDemo,
      persistSession: !isOwnerDemo,
      detectSessionInUrl: false,
    },
  }
);
