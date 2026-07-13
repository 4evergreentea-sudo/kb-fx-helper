const KST_TIMEZONE = 'Asia/Seoul'

/** KST 기준 오늘 날짜를 YYYYMMDD 형식으로 반환한다 */
export function getKstTodayYyyymmdd(referenceDate: Date = new Date()): string {
  return formatDateToYyyymmdd(getKstDateParts(referenceDate))
}

/** YYYYMMDD 형식 검증 */
export function isValidYyyymmdd(value: string): boolean {
  if (!/^\d{8}$/.test(value)) {
    return false
  }

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(4, 6))
  const day = Number(value.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** YYYYMMDD → YYYY-MM-DD */
export function toBaseDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

/** YYYYMMDD에서 days만큼 이전 날짜를 YYYYMMDD로 반환한다 */
export function subtractDaysYyyymmdd(yyyymmdd: string, days: number): string {
  const year = Number(yyyymmdd.slice(0, 4))
  const month = Number(yyyymmdd.slice(4, 6))
  const day = Number(yyyymmdd.slice(6, 8))
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() - days)

  return formatDateToYyyymmdd({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
}

/** KST 기준 시작일부터 최대 lookback일까지 YYYYMMDD 목록을 생성한다 */
export function buildLookbackDates(
  startYyyymmdd: string,
  lookbackDays: number,
): string[] {
  const dates: string[] = []

  for (let offset = 0; offset <= lookbackDays; offset += 1) {
    dates.push(subtractDaysYyyymmdd(startYyyymmdd, offset))
  }

  return dates
}

function getKstDateParts(referenceDate: Date): {
  year: number
  month: number
  day: number
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(referenceDate)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  const day = Number(parts.find((part) => part.type === 'day')?.value)

  return { year, month, day }
}

function formatDateToYyyymmdd({
  year,
  month,
  day,
}: {
  year: number
  month: number
  day: number
}): string {
  return `${String(year).padStart(4, '0')}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
}
