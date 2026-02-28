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
    extractFromScript(episodeId: number) {
        return request.post<{ task_id: string }>(`/episodes/${episodeId}/props/extract`)
    },
    batchExtractFromEpisodes(dramaId: string, episodeIds: number[]) {
        return request.post<{ task_id: string; message: string }>(
            `/dramas/${dramaId}/props/batch-extract`,
            { episode_ids: episodeIds }
        )
    },
    generateImage(id: number) {
        return request.post<{ task_id: string }>(`/props/${id}/generate`)
    },
    associateWithStoryboard(storyboardId: number, propIds: number[]) {
        return request.post<void>(`/storyboards/${storyboardId}/props`, { prop_ids: propIds })
    }
}
