export default function ErrorMessage({ error }) {
  if (!error) return null;
  const message = error?.response?.data?.error || error?.message || String(error);
  return <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-3">{message}</div>;
}
