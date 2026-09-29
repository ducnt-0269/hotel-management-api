import type { UserRole, UserStatus } from '../../users/entities/user.entity.js';

export interface UserSeed {
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
}

// Demo data, meant to be edited. The admin comes first: it is the actor
// recorded on the seeded deactivation.
export const USERS: UserSeed[] = [
  {
    email: 'admin@hotel.local',
    fullName: 'Quản Trị Viên',
    role: 'admin',
    status: 'active',
  },
  {
    email: 'an.nguyen@example.com',
    fullName: 'Nguyễn Văn An',
    role: 'user',
    status: 'active',
  },
  {
    email: 'binh.tran@example.com',
    fullName: 'Trần Thị Bình',
    role: 'user',
    status: 'active',
  },
  {
    email: 'cuong.le@example.com',
    fullName: 'Lê Minh Cường',
    role: 'user',
    status: 'active',
  },
  {
    email: 'dung.pham@example.com',
    fullName: 'Phạm Thu Dung',
    role: 'user',
    status: 'active',
  },
  {
    email: 'em.hoang@example.com',
    fullName: 'Hoàng Gia Em',
    role: 'user',
    status: 'active',
  },
  {
    email: 'giang.vu@example.com',
    fullName: 'Vũ Hương Giang',
    role: 'user',
    status: 'unverified',
  },
  {
    email: 'hai.do@example.com',
    fullName: 'Đỗ Thanh Hải',
    role: 'user',
    status: 'unverified',
  },
  {
    email: 'khanh.bui@example.com',
    fullName: 'Bùi Quốc Khánh',
    role: 'user',
    status: 'deactivated',
  },
  // Booking history needs a wider pool of active guests than the handful
  // above; these exist only to be spread across a year of demo activity.
  {
    email: 'lan.dang@example.com',
    fullName: 'Đặng Thị Lan',
    role: 'user',
    status: 'active',
  },
  {
    email: 'minh.ngo@example.com',
    fullName: 'Ngô Đức Minh',
    role: 'user',
    status: 'active',
  },
  {
    email: 'nga.duong@example.com',
    fullName: 'Dương Thị Nga',
    role: 'user',
    status: 'active',
  },
  {
    email: 'oanh.ly@example.com',
    fullName: 'Lý Kim Oanh',
    role: 'user',
    status: 'active',
  },
  {
    email: 'phuc.trinh@example.com',
    fullName: 'Trịnh Văn Phúc',
    role: 'user',
    status: 'active',
  },
  {
    email: 'quyen.mai@example.com',
    fullName: 'Mai Thanh Quyên',
    role: 'user',
    status: 'active',
  },
  {
    email: 'son.phan@example.com',
    fullName: 'Phan Hữu Sơn',
    role: 'user',
    status: 'active',
  },
  {
    email: 'thao.vuong@example.com',
    fullName: 'Vương Ngọc Thảo',
    role: 'user',
    status: 'active',
  },
  {
    email: 'tuan.dinh@example.com',
    fullName: 'Đinh Anh Tuấn',
    role: 'user',
    status: 'active',
  },
  {
    email: 'uyen.ho@example.com',
    fullName: 'Hồ Bảo Uyên',
    role: 'user',
    status: 'active',
  },
  {
    email: 'van.truong@example.com',
    fullName: 'Trương Gia Vân',
    role: 'user',
    status: 'active',
  },
  {
    email: 'yen.chu@example.com',
    fullName: 'Chu Khánh Yến',
    role: 'user',
    status: 'active',
  },
];
