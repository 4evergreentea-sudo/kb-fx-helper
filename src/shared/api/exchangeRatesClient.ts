import type { OfficialExchangeRates } from '../model'

export type ExchangeRatesClientErrorCode =
  | 'timeout'
  | 'network'
  | 'not_found'
  | 'api_error'
  | 'invalid_response'
  | 'server_misconfigured'

export class ExchangeRatesClientError extends Error {
  readonly code: ExchangeRatesClientErrorCode
  readonly status: number

  constructor(
    code: ExchangeRatesClientErrorCode,
    message: string,
    status: number,
  ) {
    super(message)
    this.name = 'ExchangeRatesClientError'
    this.code = code
    this.status = status
  }
}

export const DEFAULT_EXCHANGE_RATES_CLIENT_TIMEOUT_MS = 8000

const ERROR_MESSAGES: Record<number, string> = {
  400: '잘못된 날짜 형식입니다.',
  404: '최근 7일간 환율 데이터가 없습니다.',
  502: '환율 서버에 연결하지 못했습니다.',
  503: '환율 API가 설정되지 않았습니다.',
  504: '환율 조회 시간이 초과되었습니다. 수동으로 입력해주세요.',
}

export interface FetchOfficialExchangeRatesOptions {
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

function mapStatusToCode(status: number): ExchangeRatesClientErrorCode {
  if (status === 404) return 'not_found'
  if (status === 503) return 'server_misconfigured'
  if (status === 504) return 'timeout'
  if (status >= 500) return 'api_error'
  return 'invalid_response'
}

/** 앱 내부 /api/exchange-rates 엔드포인트에서 정규화 환율을 조회한다 */
export async function fetchOfficialExchangeRates(
  fetchImplOrOptions: typeof fetch | FetchOfficialExchangeRatesOptions = fetch,
  maybeOptions?: FetchOfficialExchangeRatesOptions,
): Promise<OfficialExchangeRates> {
  const options =
    typeof fetchImplOrOptions === 'function'
      ? (maybeOptions ?? {})
      : fetchImplOrOptions
  const fetchImpl =
    typeof fetchImplOrOptions === 'function' ? fetchImplOrOptions : fetch
  const timeoutMs =
    options.timeoutMs ?? DEFAULT_EXCHANGE_RATES_CLIENT_TIMEOUT_MS

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response

  try {
    response = await fetchImpl('/api/exchange-rates', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ExchangeRatesClientError(
        'timeout',
        '환율 조회 시간이 초과되었습니다. 수동으로 입력해주세요.',
        0,
      )
    }

    throw new ExchangeRatesClientError(
      'network',
      '네트워크 오류로 환율을 불러오지 못했습니다.',
      0,
    )
  } finally {
    clearTimeout(timeoutId)
  }

  let body: { message?: string } & Partial<OfficialExchangeRates>

  try {
    body = (await response.json()) as typeof body
  } catch {
    throw new ExchangeRatesClientError(
      'invalid_response',
      '환율 데이터 형식이 올바르지 않습니다.',
      response.status,
    )
  }

  if (!response.ok) {
    const message =
      body.message ??
      ERROR_MESSAGES[response.status] ??
      '공식 환율 API 오류가 발생했습니다.'

    throw new ExchangeRatesClientError(
      mapStatusToCode(response.status),
      message,
      response.status,
    )
  }

  if (!body.baseDate || !body.source || !body.rates) {
    throw new ExchangeRatesClientError(
      'invalid_response',
      '환율 데이터 형식이 올바르지 않습니다.',
      response.status,
    )
  }

  return {
    baseDate: body.baseDate,
    source: body.source,
    rates: body.rates,
  }
}
