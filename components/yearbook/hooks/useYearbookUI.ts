import { useState } from 'react'

export function useYearbookCoverState() {
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverPreview, setCoverPreview] = useState<{ file: File; dataUrl: string } | null>(null)
  const [coverPosition, setCoverPosition] = useState({ x: 50, y: 50 })
  const [uploadingCoverVideo, setUploadingCoverVideo] = useState(false)
  const [videoPopupUrl, setVideoPopupUrl] = useState<string | null>(null)
  const [videoPopupError, setVideoPopupError] = useState<string | null>(null)
  const [deleteCoverConfirm, setDeleteCoverConfirm] = useState<'image' | 'video' | null>(null)

  return {
    uploadingCover,
    setUploadingCover,
    coverPreview,
    setCoverPreview,
    coverPosition,
    setCoverPosition,
    uploadingCoverVideo,
    setUploadingCoverVideo,
    videoPopupUrl,
    setVideoPopupUrl,
    videoPopupError,
    setVideoPopupError,
    deleteCoverConfirm,
    setDeleteCoverConfirm
  }
}

export function useYearbookProfileEditState() {
  const [editingProfileClassId, setEditingProfileClassId] = useState<string | null>(null)
  const [editingMemberUserId, setEditingMemberUserId] = useState<string | null>(null)
  const [editProfileName, setEditProfileName] = useState('')
  const [editProfileEmail, setEditProfileEmail] = useState('')
  const [editProfileTtl, setEditProfileTtl] = useState('')
  const [editProfileInstagram, setEditProfileInstagram] = useState('')
  const [editProfilePesan, setEditProfilePesan] = useState('')
  const [editProfileVideoUrl, setEditProfileVideoUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [lastUploadedVideoName, setLastUploadedVideoName] = useState<string | null>(null)

  return {
    editingProfileClassId,
    setEditingProfileClassId,
    editingMemberUserId,
    setEditingMemberUserId,
    editProfileName,
    setEditProfileName,
    editProfileEmail,
    setEditProfileEmail,
    editProfileTtl,
    setEditProfileTtl,
    editProfileInstagram,
    setEditProfileInstagram,
    editProfilePesan,
    setEditProfilePesan,
    editProfileVideoUrl,
    setEditProfileVideoUrl,
    savingProfile,
    setSavingProfile,
    lastUploadedVideoName,
    setLastUploadedVideoName
  }
}

export function useYearbookGalleryState() {
  const [photos, setPhotos] = useState<any[]>([])
  const [galleryPhotosLoading, setGalleryPhotosLoading] = useState(false)
  const [galleryStudent, setGalleryStudent] = useState<{ classId: string; studentName: string; className: string } | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [personalCardExpanded, setPersonalCardExpanded] = useState(false)

  return {
    photos,
    setPhotos,
    galleryPhotosLoading,
    setGalleryPhotosLoading,
    galleryStudent,
    setGalleryStudent,
    photoIndex,
    setPhotoIndex,
    touchStartX,
    setTouchStartX,
    personalCardExpanded,
    setPersonalCardExpanded
  }
}
