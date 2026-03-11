export interface Prop {
    id: number
    drama_id: number
    name: string
    type?: string
    description?: string
    prompt?: string
    image_url?: string
    local_path?: string
    image_generation_status?: 'pending' | 'processing' | 'failed'
    image_generation_error?: string
    reference_images?: any
    created_at: string
    updated_at: string
}

export interface CreatePropRequest {
    drama_id: number
    name: string
    type?: string
    description?: string
    prompt?: string
    image_url?: string
    local_path?: string
}

export interface UpdatePropRequest {
    name?: string
    type?: string
    description?: string
    prompt?: string
    image_url?: string
    local_path?: string
}
