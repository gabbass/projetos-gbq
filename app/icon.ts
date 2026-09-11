import { getBrandingAsset } from "@/lib/auth/database"

export const size = { width: 32, height: 32 }
export const contentType = "image/svg+xml"
export const dynamic = "force-dynamic"

export default async function Icon() {
  const favicon = await getBrandingAsset("favicon").catch(() => null)
  const image = favicon?.data && favicon.type
    ? `<image href="data:${favicon.type};base64,${favicon.data.toString("base64")}" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect width="32" height="32" rx="8" fill="#4f46e5"/><path d="M16 7l2.5 5.5 6 .7-4.4 4.1 1.2 5.9L16 20.3l-5.3 2.9 1.2-5.9-4.4-4.1 6-.7L16 7z" fill="white"/>`

  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${image}</svg>`,
    { headers: { "Content-Type": contentType, "Cache-Control": "no-cache" } },
  )
}
