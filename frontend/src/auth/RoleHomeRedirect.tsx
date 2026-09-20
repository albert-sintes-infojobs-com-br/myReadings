import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/** Punto de entrada `/`: redirige al dashboard según el rol del usuario autenticado. */
export default function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return null; // ProtectedRoute ya garantiza sesión antes de renderizar esto
  return <Navigate to={user.role === 'PARENT' ? '/parent' : '/child'} replace />;
}
