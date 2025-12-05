
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
  // Example: 054096009510|221419681|Nguyễn Hồ N|11081999|Nam|Thôn Phú Vang, Bình Kiến, Tuy Hòa, Phú Yên|19022022
  
  if (!qrString) return null;

  // 1. Clean string (remove invisible chars like BOM if scanned incorrectly)
  // eslint-disable-next-line no-control-regex
  const cleanStr = qrString.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();

  if (!cleanStr.includes('|')) return null;

  const parts = cleanStr.split('|');
  
  if (parts.length < 6) return null; // Basic validation

  try {
    return {
      cccdNumber: parts[0],
      oldCmndNumber: parts[1] || undefined,
      fullName: parts[2],
      dob: formatDate(parts[3]),
      gender: parts[4],
      address: parts[5],
      issueDate: formatDate(parts[6])
    };
  } catch (e) {
    console.error("Error parsing CCCD:", e);
    return null;
  }
};

const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    // Converts ddmmyyyy to dd/mm/yyyy for better readability
    return `${dateStr.substring(0, 2)}/${dateStr.substring(2, 4)}/${dateStr.substring(4)}`;
};
