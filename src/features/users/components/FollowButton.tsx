import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { primaryButtonClass, secondaryButtonClass } from '#/components/ui'
import { followUserFn, unfollowUserFn } from '../server'

export function FollowButton({ username, isFollowing }: { username: string; isFollowing: boolean }) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  async function toggle() {
    setIsSaving(true)
    try {
      if (isFollowing) await unfollowUserFn({ data: { username } })
      else await followUserFn({ data: { username } })
      await router.invalidate()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isSaving}
      aria-pressed={isFollowing}
      className={isFollowing ? secondaryButtonClass : primaryButtonClass}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
