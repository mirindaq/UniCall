export function mapGenderToLabel(gender?: string | null) {
  if (!gender) {
    return '--';
  }

  const normalized = gender.trim().toLowerCase();
  if (normalized === 'male' || normalized === 'm') {
    return 'Nam';
  }
  if (normalized === 'female' || normalized === 'f') {
    return 'Nữ';
  }
  return 'Khác';
}
