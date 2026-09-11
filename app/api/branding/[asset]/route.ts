import { getBrandingAsset } from "@/lib/auth/database"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  const { asset } = await params
  if (asset !== "logo" && asset !== "favicon") return new Response("Not found", { status: 404 })

  const branding = await getBrandingAsset(asset)
  if (!branding?.data || !branding.type) return new Response("Not found", { status: 404 })

  return new Response(new Uint8Array(branding.data), {
    headers: {
      "Content-Type": branding.type,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "Last-Modified": branding.updated_at.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    },
  })
}
