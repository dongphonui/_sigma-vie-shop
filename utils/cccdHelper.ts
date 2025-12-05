
export interface CCCDData {
  cccdNumber: string;
  oldCmndNumber?: string;
  fullName: string;
  dob: string; // DD/MM/YYYY or DDMMYYYY
  gender: string;
  address: string;
  issueDate: string;
}

export const parseCCCDQrCode = (qrString: string): CCCDData | null => {
  // Format CCCD QR: 
  // ID|Old_ID|Name|DoB|Gender|Address|IssueDate
  
  if (!qrString) return null;

  // 1. Clean string: Remove only control characters that are NOT part of Vietnamese text or standard delimiters.
  // \u0000-\u001F are standard ASCII control chars.
  // Avoid stripping high unicode ranges where Vietnamese chars live.
  let cleanStr = qrString.replace(/[\x00-\x1F\x7F]/g, "").trim();

  // Handle cases where delimiters might be different (some older readers output semicolon or spaces - rare but possible)
  // Standard is '|'.
  
  if (!cleanStr.includes('|')) {
      // Try to detect if it's a raw ID without separators (unlikely for QR code but good for fallback)
      // console.log("Invalid CCCD QR Format (No pipe separator):", cleanStr);
      return null;
  }

  const parts = cleanStr.split('|');
  
  // Basic Validation: Must have at least ID, Name, DoB (Parts length >= 4 usually)
  // Index 0: CCCD (12 digits)
  // Index 1: Old CMND (9 digits or empty)
  // Index 2: Name
  // Index 3: DoB (ddMMyyyy)
  // Index 4: Gender
  // Index 5: Address
  // Index 6: Issue Date
  
  if (parts.length < 6) {
      console.log("Invalid CCCD QR Format (Not enough parts):", parts);
      return null;
  }

  try {
    return {
      cccdNumber: parts[0] || '',
      oldCmndNumber: parts[1] || undefined,
      fullName: parts[2] || '',
      dob: formatDate(parts[3]),
      gender: parts[4] || '',
      address: parts[5] || '',
      issueDate: formatDate(parts[6])
    };
  } catch (e) {
    console.error("Error parsing CCCD Data:", e);
    return null;
  }
};

const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    // Converts ddmmyyyy (e.g., 11081999) to dd/mm/yyyy (11/08/1999)
    return `${dateStr.substring(0, 2)}/${dateStr.substring(2, 4)}/${dateStr.substring(4)}`;
};
