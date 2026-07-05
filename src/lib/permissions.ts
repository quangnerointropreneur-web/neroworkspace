import { Brand, User } from "@/lib/types";

export const getAssignedBrandIds = (user?: User | null) =>
  user?.brandIds?.filter(Boolean) ?? [];

export const canAccessAllBrands = (user?: User | null) =>
  !user || user.role === "admin" || getAssignedBrandIds(user).length === 0;

export const canAccessBrand = (user: User | null | undefined, brandId?: string | null) => {
  if (!brandId) return true;
  if (canAccessAllBrands(user)) return true;
  return getAssignedBrandIds(user).includes(brandId);
};

export const getVisibleBrands = (brands: Brand[], user?: User | null) =>
  canAccessAllBrands(user) ? brands : brands.filter((brand) => canAccessBrand(user, brand.id));
