import { pascalCase } from 'scule'
import slugify from 'slugify'
import { withoutTrailingSlash, withLeadingSlash } from 'ufo'
import { defineContentPlugin } from '../..'
import { privateConfig } from '#config'

const SEMVER_REGEX = /^(\d+)(\.\d+)*(\.x)?$/

const withoutExtension = (path: string) => path.replace(/\.[^.]+$/, '')

export default defineContentPlugin({
  name: 'path-meta',
  extentions: ['.*'],
  transform (content) {
    const { locales, defaultLocale } = privateConfig.content || {}
    const parts = withoutExtension(content.meta.id)
      .split(/[/:]/)
      // First part always represents the mount-point/source
      .slice(1)

    // Check first part for locale name
    const locale = locales.includes(parts[0]) ? parts.shift() : defaultLocale

    const filePath = parts.join('/')

    Object.assign(content.meta, {
      title: content.meta.title || generateTitle(refineUrlPart(parts[parts.length - 1])),
      slug: generateSlug(filePath),
      position: generatePosition(filePath),
      draft: isDraft(filePath),
      partial: isPartial(filePath),
      locale: locale || content.meta?.locale
    })
    return content
  }
})

/**
 * When file name ends with `.draft` then it will mark as draft.
 */
const isDraft = (path: string): boolean => !!path.match(/\.draft(\/|\.|$)/)

/**
 * Files or directories that starts with underscore `_` will mark as partial content.
 */
const isPartial = (path: string): boolean => path.split(/[:/]/).some(part => part.match(/^_.*/))

/**
 * Generate slug from file name
 *
 * @param path file full path
 * @returns generated slug
 */
const generateSlug = (path: string): string =>
  withLeadingSlash(withoutTrailingSlash(path.split('/').map(part => slugify(refineUrlPart(part), { lower: true })).join('/')))

/**
 * generate title from file slug
 */
export const generateTitle = (slug: string) => slug.split(/[\s-]/g).map(pascalCase).join(' ')

/**
 * Clean up special keywords from path part
 */
export function refineUrlPart (name: string): string {
  name = name.split(/[/:]/).pop()!
  // Match 1, 1.2, 1.x, 1.2.x, 1.2.3.x,
  if (SEMVER_REGEX.test(name)) {
    return name
  }
  return (
    name
      /**
       * Remove hidden keyword
       */
      .replace(/^[_.-]/, '')
      /**
       * Remove numbering
       */
      .replace(/(\d+\.)?(.*)/, '$2')
      /**
       * Remove index keyword
       */
      .replace(/^index/, '')
      /**
       * Remove draft keyword
       */
      .replace(/\.draft/, '')
  )
}

/**
 * Generate position from file path
 */
export function generatePosition (path: string): string {
  const position = path
    .split(/[/:]/)
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^[_.-]?(\d+)\./)
      if (match && !SEMVER_REGEX.test(part)) {
        return String(match[1]).padStart(4, '0')
      }
      return '9999' // Parts without a position are going down to the bottom
    })
    .join('')
  return String(position).padEnd(12, '0').substring(0, 12)
}
