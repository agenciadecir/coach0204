import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

// GET - List all active products (for students) or all products (for admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const isAdmin = session?.user?.role === 'ADMIN'
    
    const products = await db.product.findMany({
      where: isAdmin ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}

// POST - Create a new product (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Solo el admin puede crear productos.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { productUrl, name, price, imageUrl, description } = body

    // If productUrl is provided but not the other fields, extract from Mercado Libre
    if (productUrl && (!name || !price || !imageUrl)) {
      const extractedData = await extractMercadoLibreInfo(productUrl)
      
      if (!extractedData) {
        return NextResponse.json(
          { error: 'No se pudo extraer información del producto de Mercado Libre' },
          { status: 400 }
        )
      }

      const product = await db.product.create({
        data: {
          name: extractedData.name,
          price: extractedData.price,
          imageUrl: extractedData.imageUrl,
          productUrl: productUrl,
          description: description || null
        }
      })

      return NextResponse.json(product)
    }

    // Manual creation with all fields
    if (!name || !price || !imageUrl || !productUrl) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, price, imageUrl, productUrl' },
        { status: 400 }
      )
    }

    const product = await db.product.create({
      data: {
        name,
        price,
        imageUrl,
        productUrl,
        description: description || null
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    )
  }
}

// Extract product info from Mercado Libre
async function extractMercadoLibreInfo(url: string): Promise<{
  name: string
  price: string
  imageUrl: string
} | null> {
  try {
    // Validate it's a Mercado Libre URL
    if (!url.includes('mercadolibre.com.ar') && !url.includes('mercadolibre.com')) {
      console.error('URL is not from Mercado Libre')
      return null
    }

    const zai = await ZAI.create()
    
    const result = await zai.functions.invoke('page_reader', {
      url: url
    })

    const html = result.data.html

    // Extract product name - Mercado Libre uses various patterns
    let name = ''
    
    // Try h1 with class ui-pdp-title
    const titleMatch = html.match(/<h1[^>]*class="[^"]*ui-pdp-title[^"]*"[^>]*>(.*?)<\/h1>/i)
    if (titleMatch) {
      name = cleanHtml(titleMatch[1])
    }
    
    // Fallback: try meta og:title
    if (!name) {
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
      if (ogTitleMatch) {
        name = ogTitleMatch[1]
      }
    }

    // Fallback: try title tag
    if (!name) {
      const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i)
      if (titleTagMatch) {
        // Remove " | Mercado Libre" suffix
        name = titleTagMatch[1].split('|')[0].trim()
      }
    }

    // Extract price
    let price = ''
    
    // Try meta product:price:amount
    const metaPriceMatch = html.match(/<meta[^>]*property="product:price:amount"[^>]*content="([^"]+)"/i)
    if (metaPriceMatch) {
      const priceNum = parseFloat(metaPriceMatch[1])
      price = formatPrice(priceNum)
    }

    // Fallback: try price span with class andes-money-amount
    if (!price) {
      const priceSpanMatch = html.match(/<span[^>]*class="[^"]*andes-money-amount[^"]*"[^>]*>(.*?)<\/span>/i)
      if (priceSpanMatch) {
        price = cleanHtml(priceSpanMatch[1]).replace(/\s+/g, ' ').trim()
      }
    }

    // Fallback: try price fraction
    if (!price) {
      const priceFractionMatch = html.match(/<span[^>]*class="[^"]*price-tag-fraction[^"]*"[^>]*>(.*?)<\/span>/i)
      if (priceFractionMatch) {
        price = '$ ' + cleanHtml(priceFractionMatch[1])
      }
    }

    // Extract image
    let imageUrl = ''
    
    // Try meta og:image
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1]
    }

    // Fallback: try figure with class ui-pdp-gallery
    if (!imageUrl) {
      const imgMatch = html.match(/<img[^>]*data-zoom="([^"]+)"/i)
      if (imgMatch) {
        imageUrl = imgMatch[1]
      }
    }

    // Fallback: try any img with data-src or src from product gallery
    if (!imageUrl) {
      const imgSrcMatch = html.match(/<img[^>]*(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"[^>]*class="[^"]*ui-pdp-image[^"]*"/i)
      if (imgSrcMatch) {
        imageUrl = imgSrcMatch[1]
      }
    }

    if (!name || !imageUrl) {
      console.error('Could not extract required fields:', { name, price, imageUrl })
      return null
    }

    return {
      name,
      price: price || 'Consultar precio',
      imageUrl
    }
  } catch (error) {
    console.error('Error extracting Mercado Libre info:', error)
    return null
  }
}

function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatPrice(amount: number): string {
  return '$ ' + amount.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}
