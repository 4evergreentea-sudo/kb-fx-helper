import {
  FetchEximRatesError,
  fetchEximRatesWithLookback,
} from './lib/fetchEximRates.ts'
import {
  getKstTodayYyyymmdd,
  isValidYyyymmdd,
} from './lib/kstDate.ts'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': CACHE_CONTROL,
      ...extraHeaders,
    },
  })
}

function methodNotAllowed(): Response {
  return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function getStartYyyymmdd(request: Request): string | Response {
  const url = new URL(request.url)
  const searchdate = url.searchParams.get('searchdate')

  if (searchdate === null) {
    return getKstTodayYyyymmdd()
  }

  if (!isValidYyyymmdd(searchdate)) {
    return jsonResponse({ message: '잘못된 날짜 형식입니다.' }, 400)
  }

  return searchdate
}

async function handleGet(request: Request): Promise<Response> {
  const apiKey = process.env.EXIM_API_KEY

  if (!apiKey) {
    return jsonResponse({ message: '환율 API가 설정되지 않았습니다.' }, 503)
  }

  const startDateResult = getStartYyyymmdd(request)

  if (startDateResult instanceof Response) {
    return startDateResult
  }

  try {
    const result = await fetchEximRatesWithLookback({
      apiKey,
      startYyyymmdd: startDateResult,
    })

    if (result === null) {
      return jsonResponse(
        { message: '최근 7일간 환율 데이터가 없습니다.' },
        404,
      )
    }

    return jsonResponse(result, 200)
  } catch (error) {
    if (error instanceof FetchEximRatesError) {
      const status = error.code === 'timeout' ? 504 : 502
      return jsonResponse({ message: error.message }, status)
    }

    return jsonResponse(
      { message: '환율 서버에 연결하지 못했습니다.' },
      502,
    )
  }
}

export async function GET(request: Request): Promise<Response> {
  return handleGet(request)
}

export async function POST(): Promise<Response> {
  return methodNotAllowed()
}

export async function PUT(): Promise<Response> {
  return methodNotAllowed()
}

export async function DELETE(): Promise<Response> {
  return methodNotAllowed()
}
