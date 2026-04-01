import { useCallback, useState } from 'react'

export function useYearbookSearchState() {
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('')
  const [showTeacherSearch, setShowTeacherSearch] = useState(false)
  const [classMemberSearchQuery, setClassMemberSearchQuery] = useState('')
  const [showClassMemberSearch, setShowClassMemberSearch] = useState(false)

  const openSearch = useCallback((mode: 'sambutan' | 'classes') => {
    if (mode === 'sambutan') {
      setShowTeacherSearch(true)
      return
    }
    setShowClassMemberSearch(true)
  }, [])

  const closeSearch = useCallback((mode: 'sambutan' | 'classes') => {
    if (mode === 'sambutan') {
      setShowTeacherSearch(false)
      setTeacherSearchQuery('')
      return
    }
    setShowClassMemberSearch(false)
    setClassMemberSearchQuery('')
  }, [])

  const isSearchOpen = useCallback(
    (mode: 'sambutan' | 'classes') => (mode === 'sambutan' ? showTeacherSearch : showClassMemberSearch),
    [showTeacherSearch, showClassMemberSearch]
  )

  const getSearchValue = useCallback(
    (mode: 'sambutan' | 'classes') => (mode === 'sambutan' ? teacherSearchQuery : classMemberSearchQuery),
    [teacherSearchQuery, classMemberSearchQuery]
  )

  const setSearchValue = useCallback((mode: 'sambutan' | 'classes', value: string) => {
    if (mode === 'sambutan') {
      setTeacherSearchQuery(value)
      return
    }
    setClassMemberSearchQuery(value)
  }, [])

  return {
    teacherSearchQuery,
    classMemberSearchQuery,
    showTeacherSearch,
    showClassMemberSearch,
    openSearch,
    closeSearch,
    isSearchOpen,
    getSearchValue,
    setSearchValue,
  }
}
