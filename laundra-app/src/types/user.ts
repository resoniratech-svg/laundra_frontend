export type UserRole = 'admin' | 'delivery' | 'customer' | 'cashier' | 'Delivery Staff' | 'Delivery Boy';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  phone?: string;
  address?: string;
  status?: 'Active' | 'Pending' | 'Suspended';
  companyId?: string;
  profilePhoto?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  createdAt?: string;
}
