import { describe, expect, it } from 'vitest'
import { getSyncStatusLabel, getSyncStatusVariant } from './getSyncStatusLabel'

describe('getSyncStatusLabel', () => {
  it('Supabase가 비활성화면 "로컬 저장"을 반환한다', () => {
    expect(
      getSyncStatusLabel({
        isSupabaseEnabled: false,
        isSyncing: false,
        syncMessage: '클라우드 동기화 완료',
        syncError: null,
      }),
    ).toBe('로컬 저장')
  })

  it('동기화 진행 중이면 "클라우드 동기화 중"을 반환한다', () => {
    expect(
      getSyncStatusLabel({
        isSupabaseEnabled: true,
        isSyncing: true,
        syncMessage: null,
        syncError: null,
      }),
    ).toBe('클라우드 동기화 중')
  })

  it('실패 메시지가 있으면 실패 메시지를 그대로 반환한다', () => {
    expect(
      getSyncStatusLabel({
        isSupabaseEnabled: true,
        isSyncing: false,
        syncMessage: null,
        syncError: '클라우드 동기화 실패 — 로컬에는 저장됨',
      }),
    ).toBe('클라우드 동기화 실패 — 로컬에는 저장됨')
  })

  it('성공 메시지가 있으면 성공 메시지를 반환한다', () => {
    expect(
      getSyncStatusLabel({
        isSupabaseEnabled: true,
        isSyncing: false,
        syncMessage: '클라우드 동기화 완료',
        syncError: null,
      }),
    ).toBe('클라우드 동기화 완료')
  })

  it('활성화되어 있지만 아직 동기화 시도 전이면 "로컬 저장"을 반환한다', () => {
    expect(
      getSyncStatusLabel({
        isSupabaseEnabled: true,
        isSyncing: false,
        syncMessage: null,
        syncError: null,
      }),
    ).toBe('로컬 저장')
  })
})

describe('getSyncStatusVariant', () => {
  it('상태에 따라 idle/syncing/success/error를 반환한다', () => {
    expect(
      getSyncStatusVariant({
        isSupabaseEnabled: false,
        isSyncing: false,
        syncMessage: null,
        syncError: null,
      }),
    ).toBe('idle')

    expect(
      getSyncStatusVariant({
        isSupabaseEnabled: true,
        isSyncing: true,
        syncMessage: null,
        syncError: null,
      }),
    ).toBe('syncing')

    expect(
      getSyncStatusVariant({
        isSupabaseEnabled: true,
        isSyncing: false,
        syncMessage: null,
        syncError: '실패',
      }),
    ).toBe('error')

    expect(
      getSyncStatusVariant({
        isSupabaseEnabled: true,
        isSyncing: false,
        syncMessage: '완료',
        syncError: null,
      }),
    ).toBe('success')
  })
})
