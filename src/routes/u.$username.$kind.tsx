import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { Avatar } from '#/components/Avatar'
import { EmptyState } from '#/components/EmptyState'
import { segmentClass, segmentGroupClass } from '#/components/ui'
import { getFollowList } from '#/features/users/server'

const KINDS = ['followers', 'following'] as const
type Kind = (typeof KINDS)[number]

export const Route = createFileRoute('/u/$username/$kind')({
  loader: ({ params }) => {
    const kind = params.kind as Kind
    if (!KINDS.includes(kind)) throw notFound()
    return getFollowList({ data: { username: params.username, kind } })
  },
  component: FollowListPage,
})

function FollowListPage() {
  const { user, users } = Route.useLoaderData()
  const { username, kind } = Route.useParams()
  const name = user.displayUsername ?? user.username

  return (
    <div className="space-y-4">
      <Link
        to="/u/$username"
        params={{ username }}
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        {name}
      </Link>
      <nav aria-label="Follow lists" className={segmentGroupClass}>
        {KINDS.map((value) => (
          <Link
            key={value}
            to="/u/$username/$kind"
            params={{ username, kind: value }}
            aria-current={kind === value ? 'page' : undefined}
            className={segmentClass(kind === value)}
          >
            {value === 'followers' ? 'Followers' : 'Following'}
          </Link>
        ))}
      </nav>
      {users.length === 0 ? (
        <EmptyState>{kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}</EmptyState>
      ) : (
        <ul className="space-y-1.5">
          {users.map((listedUser) =>
            listedUser.username ? (
              <li key={listedUser.username}>
                <Link
                  to="/u/$username"
                  params={{ username: listedUser.username }}
                  className="flex items-center gap-3 rounded-2xl bg-surface p-2 pr-3 hover:bg-surface-2"
                >
                  <Avatar image={listedUser.image} name={listedUser.username} className="size-11 text-base" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {listedUser.displayUsername ?? listedUser.username}
                    </p>
                    {listedUser.bio && <p className="truncate text-[13px] text-muted">{listedUser.bio}</p>}
                  </div>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  )
}
