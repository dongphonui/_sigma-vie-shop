
import * as OTPAuth from 'otpauth';

interface AdminSettings {
  username: string;
  passwordHash: string; // Store a simple hash for demonstration
  emails: string[];
  totpSecret?: string; // Secret key for Google Authenticator
  isTotpEnabled?: boolean;
}

const STORAGE_KEY = 'sigma_vie_admin_settings';
const MASTER_EMAIL = 'sigmavieshop@gmail.com';

// Super simple "hashing" for demo purposes.
const simpleHash = (s: string) => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};


const getDefaultSettings = (): AdminSettings => ({
  username: 'admin',
  passwordHash: simpleHash('admin'),
  emails: [MASTER_EMAIL],
  isTotpEnabled: false
});

const getSettings = (): AdminSettings => {
  try {
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      
      // Migration logic if needed
      if (parsed.email && !parsed.emails) {
        const migratedSettings: AdminSettings = {
          username: parsed.username,
          passwordHash: parsed.passwordHash,
          emails: [parsed.email],
          isTotpEnabled: false
        };
        if (!migratedSettings.emails.includes(MASTER_EMAIL)) {
            migratedSettings.emails.unshift(MASTER_EMAIL);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSettings));
        return migratedSettings;
      }
      
      const settings = parsed as AdminSettings;
      
      // Self-healing: Ensure master email exists
      if (!settings.emails.includes(MASTER_EMAIL)) {
          settings.emails.unshift(MASTER_EMAIL);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      }
      
      return settings;
    } else {
      const defaultSettings = getDefaultSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
  } catch (error) {
    console.error("Failed to parse admin settings from localStorage", error);
    return getDefaultSettings();
  }
};

export const verifyCredentials = (username: string, password: string): boolean => {
  const settings = getSettings();
  return settings.username === username && settings.passwordHash === simpleHash(password);
};

export const getAdminEmails = (): string[] => {
  return getSettings().emails;
};

export const getPrimaryAdminEmail = (): string => {
    const emails = getAdminEmails();
    return emails.length > 0 ? emails[0] : MASTER_EMAIL;
}

export const addAdminEmail = (email: string): void => {
  if(!email || !/^\S+@\S+\.\S+$/.test(email)) return;
  const settings = getSettings();
  if (!settings.emails.includes(email)) {
      settings.emails.push(email);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
};

export const removeAdminEmail = (emailToRemove: string): void => {
  const settings = getSettings();
  if (emailToRemove === MASTER_EMAIL) {
      alert("Không thể xóa email quản trị chính (Master Email).");
      return;
  }
  if (settings.emails.length <= 1) return;
  settings.emails = settings.emails.filter(email => email !== emailToRemove);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

// --- TOTP (Google Authenticator) Functions ---

export const isTotpEnabled = (): boolean => {
    return !!getSettings().isTotpEnabled;
};

export const generateTotpSecret = (): string => {
    // Generate a random base32 string
    const secret = new OTPAuth.Secret({ size: 20 });
    return secret.base32;
};

export const getTotpUri = (secret: string): string => {
    const totp = new OTPAuth.TOTP({
        issuer: 'Sigma Vie Admin',
        label: getPrimaryAdminEmail(),
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
    });
    return totp.toString();
};

export const enableTotp = (secret: string): void => {
    const settings = getSettings();
    settings.totpSecret = secret;
    settings.isTotpEnabled = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const disableTotp = (): void => {
    const settings = getSettings();
    settings.isTotpEnabled = false;
    delete settings.totpSecret;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const verifyTotpToken = (token: string): boolean => {
    const settings = getSettings();
    if (!settings.totpSecret || !settings.isTotpEnabled) return false;

    const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(settings.totpSecret)
    });

    // validate returns the delta (0 for current, -1 for prev, 1 for next) or null if invalid
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
};

// Helper to verify a token against a temporary secret (during setup)
export const verifyTempTotpToken = (token: string, tempSecret: string): boolean => {
    const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(tempSecret)
    });
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
};
