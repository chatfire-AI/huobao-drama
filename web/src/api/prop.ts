import request from '../utils/request'
import type { Prop, CreatePropRequest, UpdatePropRequest } from '../types/prop'

export const propAPI = {
    list(dramaId: string | number) {
        return request.get<Prop[]>('/dramas/' + dramaId + '/props')
    },
    create(data: CreatePropRequest) {
        return request.post<Prop>('/props', data)
    },
    update(id: number, data: UpdatePropRequest) {
        return request.put<void>('/props/' + id, data)
    },
    delete(id: number) {
        return request.delete<void>('/props/' + id)
    },
    extractFromScript(episodeId: number | string) {
        return request.post<{ task_id: string }>(`/episodes/${episodeId}/props/extract`)
    },
    generateImage(id: number) {
        return request.post<{ task_id: string }>(`/props/${id}/generate`)
    },
    associateWithStoryboard(storyboardId: number, propIds: number[]) {
        return request.post<void>(`/storyboards/${storyboardId}/props`, { prop_ids: propIds })
    }
}
