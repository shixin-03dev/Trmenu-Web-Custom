import request from '@/lib/request';

export interface Material {
  id?: number;
  type: string;
  ownerId: number;
  ownerName?: string;
  fileId?: string;
  fileUrl?: string;
  name: string;
  dataId: string;
  code?: string;
  createTime?: string;
  updateTime?: string;
}

export const listMaterials = async (params: { page: number; size: number; type?: string; keyword?: string; userId?: number }) => {
  return request({
    url: '/material/list',
    method: 'get',
    params
  });
};

export const getMaterialTypes = async (userId?: number) => {
  return request({
    url: '/material/types',
    method: 'get',
    params: { userId }
  });
};

export const getMaterialByCode = async (code: string) => {
  return request({
    url: '/material/by-code',
    method: 'get',
    params: { code }
  });
};

export const addMaterial = async (data: Material) => {
  return request({
    url: '/material/add',
    method: 'post',
    data
  });
};

export const updateMaterial = async (data: Material) => {
  return request({
    url: '/material/update',
    method: 'put',
    data
  });
};

export const deleteMaterial = async (id: number) => {
  return request({
    url: `/material/${id}`,
    method: 'delete'
  });
};
