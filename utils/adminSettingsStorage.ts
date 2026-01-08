
import * as OTPAuth from 'otpauth';

interface AdminSettings {
  username: string;
  passwordHash: string; 
  emails: string[];
  phoneNumber?: string; // Lưu số điện thoại admin
  totpSecret?: string; 
  isTotpEnabled?: boolean;
}

const STORAGE_KEY = 'sigma_vie_admin_settings';
const MASTER_EMAIL = 'sigmavieshop@gmail.com';

const simpleHash = (s: string) => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; 
  }
  return hash.toString();
};

const getDefaultSettings = (): AdminSettings => ({
  username: 'admin',
  passwordHash: simpleHash('admin'),
  emails: [MASTER_EMAIL],
  phoneNumber: '',
  isTotpEnabled: false
});

const getSettings = (): AdminSettings => {
  try {
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      return { ...getDefaultSettings(), ...JSON.parse(storedSettings) };
    } else {
      const defaultSettings = getDefaultSettings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    }
  } catch (error) {
    return getDefaultSettings();
  }
};

export const updateAdminPhone = (phone: string): void => {
    const settings = getSettings();
    settings.phoneNumber = phone;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const getAdminPhone = (): string => {
    // Ưu tiên sđt từ session (nếu đăng nhập bằng tài khoản nhân viên mới)
    const sessionUser = sessionStorage.getItem('adminUser');
    if (sessionUser) {
        const u = JSON.parse(sessionUser);
        if (u.phoneNumber) return u.phoneNumber;
    }
    return getSettings().phoneNumber || '';
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
  if (emailToRemove === MASTER_EMAIL) return;
  if (settings.emails.length <= 1) return;
  settings.emails = settings.emails.filter(email => email !== emailToRemove);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

// TOTP Functions...
export const isTotpEnabled = (): boolean => {
    return !!getSettings().isTotpEnabled;
};

export const generateTotpSecret = (): string => {
    const secret = new OTPAuth.Secret({ size: 20 });
    return secret.base32;
};

export const getTotpUri = (secret: string, label?: string): string => {
    const totp = new OTPAuth.TOTP({
        issuer: 'Sigma Vie Admin',
        label: label || getPrimaryAdminEmail(),
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

export const verifyTotpToken = (token: string, secretOverride?: string): boolean => {
    const settings = getSettings();
    const secret = secretOverride || settings.totpSecret;
    const isEnabled = secretOverride ? true : settings.isTotpEnabled;
    if (!secret || !isEnabled) return false;
    const cleanToken = token.replace(/\s/g, '');
    const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret)
    });
    const delta = totp.validate({ token: cleanToken, window: 20 });
    return delta !== null;
};

export const verifyTempTotpToken = (token: string, tempSecret: string): boolean => {
    return verifyTotpToken(token, tempSecret);
};
