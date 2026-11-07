import { createFileRoute } from '@tanstack/react-router'
import { Avatar } from '#/components/Avatar'
import { ViewToggle } from '#/components/ViewToggle'
import { ScoreAside, ThemeCollection } from '#/features/catalog/components/ThemeItems'
import { getArtistDetail } from '#/features/catalog/server'

export const Route = createFileRoute('/artist/$slug')({
  loader: ({ params }) => getArtistDetail({ data: { slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.artist.name} · NoSkip` : 'NoSkip' }],
  }),
  component: ArtistPage,
})

function ArtistPage() {
  const { artist, themes } = Route.useLoaderData()

  return (
    <div data-view-scope="artist" className="space-y-5">
      <header className="flex items-center gap-4">
        <Avatar image={null} name={artist.name} className="size-16 text-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">{artist.name}</h1>
          {artist.nameNative && <p className="text-sm text-muted">{artist.nameNative}</p>}
          <p className="text-sm text-muted">
            {themes.length} {themes.length === 1 ? 'theme' : 'themes'}
          </p>
        </div>
        <ViewToggle scope="artist" />
      </header>
      <ThemeCollection
        themes={themes}
        view="saved"
        label={`Themes by ${artist.name}`}
        emptyMessage="No openings or endings catalogued for this artist."
        renderAside={(theme, view) => (
          <ScoreAside score={theme.averageScore} voteCount={theme.voteCount} view={view} />
        )}
      />
    </div>
  )
}
