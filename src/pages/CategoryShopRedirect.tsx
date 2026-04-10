import { Navigate, useParams } from 'react-router-dom';

/** `/categories/rings` → shop filtered the same as `/shop?category=rings`. */
const CategoryShopRedirect = () => {
  const { handle } = useParams<{ handle: string }>();
  const h = handle?.trim();
  if (!h) return <Navigate to="/shop" replace />;
  return <Navigate to={`/shop?category=${encodeURIComponent(h)}`} replace />;
};

export default CategoryShopRedirect;
