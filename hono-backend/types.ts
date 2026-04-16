// types.ts
// TypeScript interfaces for main entities in hono-backend

export interface Album {
  id: string
  name: string
  type: string
  status: string
  cover_image_url?: string | null
  cover_image_position?: string | null
  cover_video_url?: string | null
  description?: string | null
  user_id: string
  created_at: string
  flipbook_mode?: string
  payment_status?: string
  payment_url?: string | null
  total_estimated_price?: number
  pricing_package_id?: string | null
  individual_payments_enabled?: number
}

export interface AlbumClass {
  id: string
  album_id: string
  name: string
  sort_order: number
  batch_photo_url?: string | null
}

export interface AlbumClassAccess {
  id: string
  album_id: string
  class_id: string
  user_id: string
  student_name: string
  email?: string | null
  status: string
  has_paid?: number
  payment_status?: string
  payment_transaction_id?: string | null
  created_at?: string
  date_of_birth?: string | null
  instagram?: string | null
  message?: string | null
  video_url?: string | null
  photos?: string[]
}

export interface User {
  id: string
  email: string
  role: 'admin' | 'user'
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}

export interface AlbumMember {
  album_id: string
  user_id: string
  role: string
}

export interface AlbumJoinRequest {
  id: string
  album_id: string
  assigned_class_id: string
  user_id: string
  student_name: string
  email?: string | null
  status: string
  requested_at?: string
}
