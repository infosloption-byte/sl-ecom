export async function api(url, options = {}) {
  const { body, ...rest } = options;
  let response;
  try {
    response = await fetch(`/api${url}`, {
      credentials: 'include',
      ...rest,
      headers: { ...(body instanceof FormData ? {} : body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(rest.headers || {}) },
      ...(body !== undefined ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {})
    });
  } catch { throw new Error('Unable to reach the store. Check your connection.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
export const lkr = cents => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format((Number(cents) || 0) / 100);
export const dateText = date => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium' }).format(new Date(date));
export const districts = ['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya'];
export const emptyAddress = { fullName: '', phone: '', line1: '', line2: '', city: '', district: 'Colombo', postal: '' };
