import request from '@/lib/request';

// Login
export function login(data: any) {
  return request({
    url: '/login',
    headers: {
      isToken: false
    },
    method: 'post',
    data: data
  });
}

// Get User Info
export function getInfo() {
  return request({
    url: '/getInfo',
    method: 'get'
  });
}

// Get Captcha Image
export function getCodeImg() {
  return request({
    url: '/captchaImage',
    headers: {
      isToken: false
    },
    method: 'get',
    timeout: 20000
  });
}
