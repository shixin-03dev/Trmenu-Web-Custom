import request from '@/lib/request';

export interface CollaborationRoom {
  id?: number;
  roomId: string;
  roomName: string;
  password?: string;
  capacity: number;
  currentUsers: number;
  hostId: number;
  hostName: string;
  createTime?: string;
  lastHeartbeat?: string;
  hasPassword?: boolean;
  status?: string;
}

export const listRooms = async (keyword?: string) => {
  const res: any = await request({
    url: '/collaboration/room/list',
    method: 'get',
    params: { keyword }
  });
  return res.data as CollaborationRoom[];
};

export const getRoom = async (roomId: string) => {
  const res: any = await request({
    url: `/collaboration/room/${roomId}`,
    method: 'get'
  });
  return res.data as CollaborationRoom;
};

export const joinRoom = async (roomId: string, password?: string) => {
  return request({
    url: '/collaboration/room/join',
    method: 'post',
    data: { roomId, password }
  });
};

export const createRoom = async (data: CollaborationRoom) => {
  const res: any = await request({
    url: '/collaboration/room/create',
    method: 'post',
    data
  });
  return res.data as CollaborationRoom;
};

export const sendHeartbeat = (roomId: string) => {
  return request({
    url: `/collaboration/room/heartbeat/${roomId}`,
    method: 'post'
  });
};

export const deleteRoom = (roomId: string) => {
  return request({
    url: `/collaboration/room/${roomId}`,
    method: 'delete'
  });
};
