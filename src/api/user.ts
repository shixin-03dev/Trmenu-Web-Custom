import request from '@/lib/request';

// Get user profile
export function getUserProfile() {
  return request({
    url: '/system/user/profile',
    method: 'get'
  });
}

// Update user profile
export function updateUserProfile(data: any) {
  return request({
    url: '/system/user/profile',
    method: 'put',
    data: data
  });
}

// Update password
export function updatePwd(oldPassword: string, newPassword: string) {
  return request({
    url: '/system/user/profile/updatePwd',
    method: 'put',
    params: { oldPassword, newPassword }
  });
}

// Upload avatar
export function uploadAvatar(data: FormData) {
  return request({
    url: '/system/user/profile/avatar',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: data
  });
}
