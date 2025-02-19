import { type H3Event, getQuery, setHeader } from 'h3'
import { fixSlashes } from 'site-config-stack/urls'
import type { NitroUrlResolvers, SitemapDefinition } from '../types'
import { buildSitemap } from './builder/sitemap'
import { buildSitemapIndex } from './builder/sitemap-index'

// @ts-expect-error virtual
import { useNitroApp } from '#internal/nitro'

// @ts-expect-error virtual
import { createSitePathResolver, useSiteConfig } from '#internal/nuxt-site-config'

export function useNitroUrlResolvers(e: H3Event): NitroUrlResolvers {
  const canonicalQuery = getQuery(e).canonical
  const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'
  const siteConfig = useSiteConfig(e)
  return {
    event: e,
    fixSlashes: (path: string) => fixSlashes(siteConfig.trailingSlash, path),
    // we need these as they depend on the nitro event
    canonicalUrlResolver: createSitePathResolver(e, {
      canonical: isShowingCanonical || !process.dev,
      absolute: true,
      withBase: true,
    }),
    relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
  }
}

export async function createSitemap(e: H3Event, definition: SitemapDefinition) {
  const { sitemapName } = definition
  const nitro = useNitroApp()
  let sitemap = await (
    definition.sitemapName === 'index'
      ? buildSitemapIndex(useNitroUrlResolvers(e))
      : buildSitemap(definition, useNitroUrlResolvers(e))
  )
  const ctx = { sitemap, sitemapName }
  await nitro.hooks.callHook('sitemap:output', ctx)
  sitemap = ctx.sitemap
  // need to clone the config object to make it writable
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')
  e.context._isSitemap = true
  return sitemap
}
