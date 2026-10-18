export function profileAge(value, now = new Date()) {
  const dob = value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === 'string' ? value.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const date = new Date(`${dob}T00:00:00Z`);
  const today = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dob || dob > today) return null;
  let age = Number(today.slice(0, 4)) - Number(dob.slice(0, 4));
  if (today.slice(5) < dob.slice(5)) age--;
  return age;
}

export function profileSex(value) {
  const sex = String(value ?? '').trim().toLowerCase();
  return ['m', 'male'].includes(sex) ? 'Male' : ['f', 'female'].includes(sex) ? 'Female' : '';
}
