
interface AdminSettings {
  username: string;
  passwordHash: string; // Store a simple hash for demonstration
  emails: string[];
}

// For migration from old version
interface OldAdminSettings {
  username: string;
  passwordHash: string;
  email: string;
}

const STORAGE_KEY = 'sigma_vie_admin_settings';

// Super simple "hashing" for demo purposes.
// In a real app, NEVER do this. Use a proper library like bcrypt.
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
  emails: ['sigmavieshop@gmail.com'],
});

const getSettings = (): AdminSettings => {
  try {
    const storedSettings = localStorage.getItem(STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      // Migration from old structure (single email) to new one (array of emails)
      if (parsed.email && !parsed.emails) {
        const migratedSettings: AdminSettings = {
          username: parsed.username,
          passwordHash: parsed.passwordHash,
          emails: [parsed.email]
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSettings));
        return migratedSettings;
      }
      return parsed as AdminSettings;
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
    return emails.length > 0 ? emails[0] : '';
}

export const addAdminEmail = (email: string): void => {
  if(!email || !/^\S+@\S+\.\S+$/.test(email)) return; // Basic email validation
  const settings = getSettings();
  if (!settings.emails.includes(email)) {
      settings.emails.push(email);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
};

export const removeAdminEmail = (emailToRemove: string): void => {
  const settings = getSettings();
  // Prevent deleting the last email
  if (settings.emails.length <= 1) return;
  settings.emails = settings.emails.filter(email => email !== emailToRemove);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
