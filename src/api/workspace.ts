import request from '@/lib/request';

export interface Workspace {
    id: string;
    name: string;
    description: string;
    data: any;
    userId?: number;
    userName?: string;
    menuCount?: number;
    // Publishing Info
    isPublished?: boolean;
    publishType?: 'public' | 'paid';
    price?: number;
    coverImage?: string;
    downloads?: number;
    likes?: number;
    favorites?: number;
    createdAt?: string;
    updatedAt?: string;
}

export const toggleLike = async (id: string) => {
    return request({
        url: `/workspace/${id}/like`,
        method: 'post'
    });
};

export const toggleFavorite = async (id: string) => {
    return request({
        url: `/workspace/${id}/favorite`,
        method: 'post'
    });
};

export const subscribeWorkspace = async (id: string) => {
    return request({
        url: `/workspace/${id}/subscribe`,
        method: 'post'
    });
};

export const listSubscribedWorkspaces = async () => {
    return request({
        url: '/workspace/subscriptions',
        method: 'get'
    }).then((res: any) => (res.data || []) as Workspace[]);
};

export const listLikedWorkspaces = async () => {
    return request({
        url: '/workspace/likes',
        method: 'get'
    }).then((res: any) => (res.data || []) as Workspace[]);
};

export const listFavoriteWorkspaces = async () => {
    return request({
        url: '/workspace/favorites',
        method: 'get'
    }).then((res: any) => (res.data || []) as Workspace[]);
};

export const createWorkspace = async (data: Partial<Workspace>) => {
    return request({
        url: '/workspace/create',
        method: 'post',
        data
    }).then((res: any) => res.data as Workspace);
};

export const updateWorkspace = async (id: string, data: Partial<Workspace>) => {
    return request({
        url: `/workspace/${id}`,
        method: 'put',
        data
    });
};

export const listWorkspaces = async () => {
    return request({
        url: '/workspace/list',
        method: 'get'
    }).then((res: any) => (res.data || []) as Workspace[]);
};

export const listMarketWorkspaces = async () => {
    return request({
        url: '/workspace/market',
        method: 'get'
    }).then((res: any) => (res.data || []) as Workspace[]);
};

export const publishWorkspace = async (id: string, data: Partial<Workspace>) => {
    return request({
        url: `/workspace/${id}/publish`,
        method: 'post',
        data
    });
};

export const unpublishWorkspace = async (id: string) => {
    return request({
        url: `/workspace/${id}/unpublish`,
        method: 'post'
    });
};

export const getWorkspace = async (id: string) => {
    const res: any = await request({
        url: `/workspace/${id}`,
        method: 'get'
    });
    return res.data as Workspace;
};

export const deleteWorkspace = async (id: string) => {
    return request({
        url: `/workspace/${id}`,
        method: 'delete'
    });
};
