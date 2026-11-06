import { useAuth } from '../context/AuthContext';

// Renders children only if the current user holds the given permission code.
export default function PermissionGate({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) return fallback;
  return children;
}
