import auth from '@react-native-firebase/auth';

export function getFirebaseAuth() {
  return auth();
}

export function toFirebasePhoneNumber(phoneNumber: string) {
  const raw = phoneNumber.trim();
  const digits = raw.replace(/\D/g, '');

  if (/^0\d{9}$/.test(digits)) {
    return `+84${digits.slice(1)}`;
  }
  if (/^84\d{9}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^\+84\d{9}$/.test(raw)) {
    return raw;
  }

  throw new Error('Số điện thoại không hợp lệ. Vui lòng nhập theo định dạng Việt Nam.');
}
