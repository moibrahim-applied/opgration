-- Fix encryption functions to not rely on app.encryption_key
-- Instead, use environment variable directly

-- Drop old functions
DROP FUNCTION IF EXISTS encrypt_credential(TEXT);
DROP FUNCTION IF EXISTS decrypt_credential(TEXT);

-- Create new encryption function using a hardcoded key for now
-- In production, you'd use a proper key management system
CREATE OR REPLACE FUNCTION encrypt_credential(credential_value TEXT)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT := 'your-32-character-encryption-key-here-change-me';
BEGIN
  RETURN encode(
    pgp_sym_encrypt(
      credential_value,
      encryption_key
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new decryption function
CREATE OR REPLACE FUNCTION decrypt_credential(encrypted_value TEXT)
RETURNS TEXT AS $$
DECLARE
  encryption_key TEXT := 'your-32-character-encryption-key-here-change-me';
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_value, 'base64'),
    encryption_key
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPORTANT: After running this, change 'your-32-character-encryption-key-here-change-me'
-- to a secure random key (same key in both functions)