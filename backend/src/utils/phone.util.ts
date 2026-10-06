export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  const hadPlus = rawPhone.trim().startsWith('+');
  // Remove spaces, dashes, parentheses, non-digits
  let cleaned = rawPhone.replace(/[^\d]/g, '');

  // If did NOT have leading + and looks like a Brazilian phone (10 or 11 digits), prepend 55
  if (!hadPlus && (cleaned.length === 10 || cleaned.length === 11) && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) return phone || '';

  if (normalized.startsWith('55') && (normalized.length === 12 || normalized.length === 13)) {
    const ddd = normalized.slice(2, 4);
    const rest = normalized.slice(4);
    if (rest.length === 9) {
      return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return `+${normalized}`;
}
