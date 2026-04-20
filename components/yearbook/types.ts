export type AlbumClass = {
  id: string
  name: string
  sort_order?: number
  student_count?: number
  batch_photo_url?: string | null
}

export type PackageSnapshot = {
  name: string
  price_per_student: number
  min_students: number
  features: string
  flipbook_enabled: boolean
  ai_labs_features: string[]
}

export type Album = {
  id: string
  name: string
  type: string
  status?: string
  cover_image_url?: string | null
  cover_image_position?: string | null
  cover_video_url?: string | null
  description?: string | null
  isOwner?: boolean
  isAlbumAdmin?: boolean
  isGlobalAdmin?: boolean
  flipbook_mode?: 'manual' | null
  payment_status?: string
  payment_url?: string | null
  total_estimated_price?: number
  pricing_package_id?: string | null
  package_snapshot?: PackageSnapshot | null
  classes: AlbumClass[]
}

export type ClassAccess = {
  id: string
  student_name: string
  email?: string | null
  status: string
  date_of_birth?: string | null
  instagram?: string | null
  message?: string | null
  video_url?: string | null
}

export type ClassRequest = {
  id: string
  student_name: string
  email?: string | null
  status: string
}

export type ClassMember = {
  user_id: string
  student_name: string
  email: string | null
  date_of_birth: string | null
  instagram: string | null
  tiktok?: string | null
  message: string | null
  video_url: string | null
  photos?: string[]
  is_me?: boolean
  status?: string
}

export type Photo = {
  id: string
  file_url: string
  student_name: string
  created_at?: string
}

export type TeacherPhoto = {
  id: string
  file_url: string
  sort_order: number
}

export type Teacher = {
  id: string
  name: string
  title?: string
  message?: string
  photo_url?: string
  video_url?: string
  sort_order?: number
  photos?: TeacherPhoto[]
}
