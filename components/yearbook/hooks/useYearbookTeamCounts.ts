import { useState } from 'react'

export function useYearbookTeamCounts() {
  const [teacherCount, setTeacherCount] = useState<number>(0)
  const [teamMemberCount, setTeamMemberCount] = useState<number>(0)

  return {
    teacherCount,
    setTeacherCount,
    teamMemberCount,
    setTeamMemberCount,
  }
}
